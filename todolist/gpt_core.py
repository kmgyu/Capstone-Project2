import openai
import json
import re
from datetime import datetime, timedelta
from django.conf import settings
from django.utils.timezone import localtime
from celery import shared_task
from .models import Field, FieldTodo
from django.contrib.auth import get_user_model
from konlpy.tag import Okt
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import calendar

openai.api_key = settings.OPENAI_API_KEY
User = get_user_model()
okt = Okt()

PEST_KEYWORDS = ["진딧물", "응애", "방제", "병해충", "살충제", "살균제", "해충", "전염병", "병해", "충해"]

# -------- 공통 유틸 함수 -------- #
def is_duplicate_by_cosine(new_task_name, existing_task_names, threshold=0.75):
    if not existing_task_names:
        return False
    vectorizer = TfidfVectorizer(tokenizer=okt.morphs)
    vectors = vectorizer.fit_transform([new_task_name] + existing_task_names)
    similarity = cosine_similarity(vectors[0:1], vectors[1:])
    return any(score >= threshold for score in similarity[0])

def save_task(user, field, task_data, date):
    FieldTodo.objects.create(
        owner=user,
        field=field,
        task_name=task_data["task_name"][:50],
        task_content=task_data["task_content"],
        period=task_data.get("period"),
        cycle=task_data.get("cycle"),
        is_pest=any(k in task_data["task_content"] for k in PEST_KEYWORDS),
        start_date=date
    )

# -------- 1. 월간 키워드 생성 -------- #
def generate_month_keywords(field):
    today = datetime.today().date()
    days_since_start = (today - field.farm_startdate).days
    if days_since_start < 30:
        stage = "파종 직후"
    elif days_since_start < 60:
        stage = "초기 생육기"
    elif days_since_start < 90:
        stage = "성장기"
    else:
        stage = "후기 생육기"

    prompt = f"""
작물: {field.crop_name}
월: {today.month}월
생육 단계: {stage}
지역: {field.field_address}
위 조건을 바탕으로 이번 달 주요 농작업 키워드 5~7개를 JSON 배열로 추천해줘.
"""
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "system", "content": "너는 농업 키워드 전문가야."},
                  {"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=150
    )
    try:
        return json.loads(response['choices'][0]['message']['content'])
    except:
        return []

# -------- 2. 2주치 할 일 생성 -------- #
def generate_biweekly_tasks(user, field, start_date, keywords):
    # TODO: 아래 pest_info, weather_info는 실제 병해충 탐지 및 날씨 API로부터 받아올 예정입니다.
    # 현재는 더미 데이터를 사용합니다.
    pest_info = "진딧물 관찰됨 (더미 데이터)"
    weather_info = "흐리고 습함 (더미 데이터)"
    last_week = start_date - timedelta(days=7)
    prev_tasks = FieldTodo.objects.filter(field=field, start_date__range=(last_week, start_date - timedelta(days=1)))
    task_names = [t.task_name for t in prev_tasks]
    summary = ", ".join(task_names) if task_names else "없음"

    prompt = f"""
작물: {field.crop_name}
위치: {field.field_address}
지난 주 작업: {summary}
키워드: {', '.join(keywords)}
다음 2주 동안 해야 할 일들을 날짜별로 JSON 형식으로 추천해줘.
형식:
{{
  "YYYY-MM-DD": [
    {{"task_name": "작업명", "task_content": "내용", "period": 2, "cycle": 7}},
    ...
  ]
}}
"""
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "system", "content": "너는 농업 일정 전문가야."},
                  {"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=1500
    )
    try:
        parsed = json.loads(response['choices'][0]['message']['content'])
    except:
        return

    for date_str, task_list in parsed.items():
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        existing_tasks = FieldTodo.objects.filter(field=field, start_date=target_date)
        existing_names = [t.task_name for t in existing_tasks]

        for task_data in task_list:
            if is_duplicate_by_cosine(task_data["task_name"], existing_names):
                existing_tasks.filter(task_name=task_data["task_name"]).delete()
            save_task(user, field, task_data, target_date)

# -------- 3. 하루치 할 일 생성 -------- #
def generate_daily_tasks_for_field(user, field, pest_info, weather_info):
    # TODO: 현재 pest_info, weather_info는 더미 데이터입니다. 실제 연동 필요.
    today = datetime.today().date()
    prompt = f"""
작물: {field.crop_name}
날짜: {today}
위치: {field.field_address}
병해충 정보: {pest_info}
날씨 정보: {weather_info}
오늘 필요한 대응 작업을 최대 3개 JSON 배열로 출력해줘.
형식:
[
  {{"task_name": "작업명", "task_content": "내용", "period": 1, "cycle": 1}},
  ...
]
"""
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "system", "content": "너는 병해충 대응 전문가야."},
                  {"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=600
    )
    try:
        parsed = json.loads(response['choices'][0]['message']['content'])
    except:
        return

    existing_tasks = FieldTodo.objects.filter(field=field, start_date=today)
    existing_names = [t.task_name for t in existing_tasks]

    for task_data in parsed:
        if task_data["task_name"] in existing_names:
            existing_tasks.filter(task_name=task_data["task_name"]).delete()
        save_task(user, field, task_data, today)

# -------- 4. 월간 할 일 생성 -------- #
def generate_monthly_tasks(user, field, keywords):
    today = datetime.today().date()
    year, month = today.year, today.month

    prompt = f"""
작물: {field.crop_name}
위치: {field.field_address}
키워드: {', '.join(keywords)}
이번 {month}월에 해야 할 일을 날짜별로 JSON 형식으로 출력해줘.
형식:
{{
  "1": [
    {{"task_name": "작업명", "task_content": "내용", "period": 3, "cycle": 7}},
    ...
  ],
  ...
}}
"""
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "system", "content": "너는 월간 농업 계획 전문가야."},
                  {"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=1500
    )
    try:
        parsed = json.loads(response['choices'][0]['message']['content'])
    except:
        return

    for day_str, task_list in parsed.items():
        try:
            day = int(re.sub(r"\D", "", day_str))
            target_date = today.replace(day=day)
        except:
            continue
        for task_data in task_list:
            save_task(user, field, task_data, target_date)

