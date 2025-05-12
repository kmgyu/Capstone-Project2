import openai
import json
import re
from datetime import datetime, timedelta, time
from django.conf import settings
from django.utils.timezone import  make_aware, is_naive
from celery import shared_task
from .models import FieldTodo
from fieldmanage.models import MonthlyKeyword
from django.contrib.auth import get_user_model
from konlpy.tag import Okt
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from todolist.utils import create_task_progress_entries


openai.api_key = settings.OPENAI_API_KEY
User = get_user_model()
okt = Okt()

PEST_KEYWORDS = ["진딧물", "응애", "방제", "병해충", "살충제", "살균제", "해충", "전염병", "병해", "충해"]
GPT = "gpt-4"

today = datetime.today().date()


# -------- 공통 유틸 함수 -------- #
def is_duplicate_by_cosine(new_task_name, existing_task_names, threshold=0.75):
    if not existing_task_names:
        return False
    vectorizer = TfidfVectorizer(tokenizer=okt.morphs)
    vectors = vectorizer.fit_transform([new_task_name] + existing_task_names)
    similarity = cosine_similarity(vectors[0:1], vectors[1:])
    return any(score >= threshold for score in similarity[0])

def save_task(user, field, task_data, start_date):
    # 문자열이면 datetime으로 파싱
    if isinstance(start_date, str):
        try:
            start_date = datetime.strptime(start_date, "%Y-%m-%d")
        except Exception as e:
            print(f"[Invalid date string in save_task]: {start_date} => {e}")
            return

    # date 객체면 datetime으로 변환
    elif isinstance(start_date, datetime) is False:
        start_date = datetime.combine(start_date, time.min)

    # 시간대가 없는 datetime이면 timezone aware로 변환
    if is_naive(start_date):
        start_date = make_aware(start_date)

    try:
        period = int(re.sub(r"[^\d]", "", str(task_data.get("period", 1))) or "1")
        cycle = int(re.sub(r"[^\d]", "", str(task_data.get("cycle", 0))) or "0")
    except Exception as e:
        print(f"[Invalid period/cycle]: {task_data} => {e}")
        return
    
    # ✅ 중복 검사: 해당 기간 내 유사한 task_name 존재 여부
    end_date = start_date + timedelta(days=period - 1)
    existing_tasks = FieldTodo.objects.filter(
        field=field,
        start_date__range=(start_date, end_date)
    )
    existing_names = [t.task_name for t in existing_tasks]

    if is_duplicate_by_cosine(task_data["task_name"], existing_names):
        print(f"[중복됨] {task_data['task_name']}")
        return  # 저장 안 함

    task = FieldTodo.objects.create(
        owner=user,
        field=field,
        task_name=task_data["task_name"][:50],
        task_content=task_data["task_content"],
        period=period,
        cycle=cycle,
        is_pest=any(k in task_data["task_content"] for k in PEST_KEYWORDS),
        start_date=start_date
    )
    create_task_progress_entries(task)


# -------- 1. 월간 키워드 생성 및 저장 -------- #
def generate_month_keywords(field):
    today = datetime.today().date()
    prompt = f"""
작물: {field.crop_name}
월: {today.month}월
지역: {field.field_address}
위 조건을 바탕으로 이번 달 주요 농작업 키워드 3~5개를 JSON 배열로 추천해줘.
"""
    response = openai.ChatCompletion.create(
        model=GPT,
        messages=[{"role": "system", "content": "너는 농업 키워드 전문가야."},
                  {"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=150
    )
    try:
        keywords = json.loads(response['choices'][0]['message']['content'])
        # DB 저장
        for kw in keywords:
            MonthlyKeyword.objects.update_or_create(
                field_id=field,
                year=today.year,
                month=today.month,
                defaults={"keywords": keywords}
        )
        return keywords
    except Exception as e:
        print(f"[Keyword Parsing Error] {e}")
        return []

# -------- 2. 2주치 할 일 생성 -------- #
def generate_biweekly_tasks(user, field, pest_info, weather, keywords, base_date):
    last_week = base_date - timedelta(days=7)

    prev_tasks = FieldTodo.objects.filter(
        field=field,
        start_date__range=(last_week, base_date - timedelta(days=1))
    )
    task_names = [t.task_name for t in prev_tasks]
    summary = ", ".join(task_names) if task_names else "없음"

    prompt = f"""
오늘은 {base_date.strftime("%Y-%m-%d")}입니다.
작물: {field.crop_name}
위치: {field.field_address}
지난 주 작업: {summary}
기후: {weather}
키워드: {', '.join(keywords)}

오늘 날짜를 기준으로 향후 14일 간(작업 시작일 기준) 해야 할 농작업들을 하루 단위로 JSON 배열 형식으로 추천해줘.(최대 하루에 2개, 무조건 하루마다 있어야하는건 아님.)
오늘이 1일이라면 무조건 15일 이내에 작업 시작일이 있어야함.
각 작업은 아래 형식을 따르고, 반드시 `start_date` 필드를 포함해야 해.
**period와 cycle은 정수로만 표시해야 해!** (예: 0, 1, 7, 14)
period는 작업의 총 기간이고, cycle은 작업의 기간동안 며칠마다 반복할지야(예: period:4, cycle:2라면 총 4일동안 2일씩 두 번 한다는 소리임. 절대로 cycle이 period보다 높을 수 없음음)
작업은 작업 시작일 기준으로 순서대로 만들어야해
설명 없이 JSON만 출력해야 해.

형식:
[
  {{"task_name": "작업명", "task_content": "내용", "period": "기간", "cycle": "주기", "start_date": "작업 시작일"}},
  ...
]
그리고 토큰은 2000이내로 해야돼.
"""

    response = openai.ChatCompletion.create(
        model=GPT,
        messages=[
            {"role": "system", "content": "너는 농업 일정 전문가야."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=2000
    )

    try:
        parsed = json.loads(response['choices'][0]['message']['content'])
    except Exception as e:
        print(f"[Biweekly Parsing Error] {e}")
        return

    for task_data in parsed:
        start_date_str = task_data.get("start_date")
        if not start_date_str:
            print(f"[Missing start_date]: {task_data}")
            continue

        # ⬇️ 파싱 대신 문자열을 그대로 넘기고 save_task에서 처리
        try:
            save_task(user, field, task_data, start_date_str)
        except Exception as e:
            print(f"[Save Error]: {e}")



# -------- 3. 하루치 할 일 생성 -------- #
def generate_daily_tasks_for_field(user, field, pest_info, weather_info):
    today = datetime.today().date()
    prompt = f"""
오늘은 {today.strftime("%Y-%m-%d")}입니다.
작물: {field.crop_name}
위치: {field.field_address}
병해충 정보: {pest_info}
날씨 정보: {weather_info}
오늘 필요한 대응 작업을 최대 3개 JSON 배열로 출력해줘.
각 작업은 아래 형식을 따르고, 반드시 start_date 필드를 포함해야 해.
**period와 cycle은 반드시 정수로 표현해줘.**(예: 0, 1, 7, 14)
period는 작업의 총 기간이고, cycle은 작업의 기간동안 며칠마다 반복할지야(예: period:4, cycle:2라면 총 4일동안 2일씩 두 번 한다는 소리임.)
작업은 작업 시작일 기준으로 순서대로 만들어야해
설명 없이 JSON만 출력해야 해.
형식:
[
  {{"task_name": "작업명", "task_content": "내용", "period": "기간", "cycle": "주기", "start_date": "작업 시작일"}}
  ...
]
설명 없이 JSON만 출력해.
"""

    response = openai.ChatCompletion.create(
        model=GPT,
        messages=[{"role": "system", "content": "너는 병해충 대응 전문가야."},
                  {"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=600
    )
    try:
        parsed = json.loads(response['choices'][0]['message']['content'])
    except Exception as e:
        print(f"[Daily Parsing Error] {e}")
        return

    for task_data in parsed:
        start_date_str = task_data.get("start_date")
        if not start_date_str:
            print(f"[Missing start_date]: {task_data}")
            continue

        save_task(user, field, task_data, start_date_str)

# -------- 4. 월간 할 일 생성 -------- #
def generate_monthly_tasks(user, field, keywords):
    today = datetime.today().date()
    prompt = f"""
오늘은 {today.strftime("%Y-%m-%d")}입니다.
작물: {field.crop_name}
위치: {field.field_address}
키워드: {', '.join(keywords)}

이번 달에 해야 할 농작업들을 하루 단위로로 JSON 배열 형식으로 추천해줘.(하루마다 무조건 있지않아도되고 핵심 작업만 생성해줘줘)
각 작업은 반드시 start_date를 포함해야 하며, 날짜는 YYYY-MM-DD 형식으로 해줘.
오늘 필요한 대응 작업을 최대 3개 JSON 배열로 출력해줘.
**period와 cycle은 반드시 정수로 표현해줘.**(예: 0, 1, 7, 14)
period는 작업의 총 기간이고, cycle은 작업의 기간동안 며칠마다 반복할지야(예: period:4, cycle:2라면 총 4일동안 2일씩 두 번 한다는 소리임.)
작업은 작업 시작일 기준으로 순서대로 만들어야해
설명 없이 JSON만 출력해야 해.

형식:
[
  {{"task_name": "작업명", "task_content": "내용", "period": "기간", "cycle": "주기", "start_date": "작업 시작일"}},
  ...
]
설명 없이 JSON만 출력해.
"""

    response = openai.ChatCompletion.create(
        model=GPT,
        messages=[{"role": "system", "content": "너는 월간 농업 계획 전문가야."},
                  {"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=2000
    )
    try:
        parsed = json.loads(response['choices'][0]['message']['content'])
    except Exception as e:
        print(f"[Monthly Parsing Error] {e}")
        return

    for task_data in parsed:
        start_date_str = task_data.get("start_date")
        if not start_date_str:
            print(f"[Missing start_date]: {task_data}")
            continue

        try:
            save_task(user, field, task_data, start_date_str)
        except Exception as e:
            print(f"[Save Error in monthly]: {e}")
