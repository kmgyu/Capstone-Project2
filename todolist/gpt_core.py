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

PEST_KEYWORDS = ["진딧물", "방제", "병해충", "살충제", "살균제", "해충", "전염병", "병해", "충해"]
GPT = "gpt-4"

today = datetime.today().date()


# -------- 공통 유틸 함수 -------- #
def is_duplicate_by_cosine(new_task_name, new_task_content, existing_tasks, threshold=0.85):
    # 작업명 + 내용 결합
    new_text = f"{new_task_name} {new_task_content}"
    existing_texts = [f"{t.task_name} {t.task_content or ''}" for t in existing_tasks]

    if not existing_texts:
        return False

    vectorizer = TfidfVectorizer(tokenizer=okt.morphs, token_pattern=None)
    vectors = vectorizer.fit_transform([new_text] + existing_texts)
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
    
    try:
        priority = int(task_data.get("priority", 3))
    except Exception as e:
        print(f"[Invalid priority]: {task_data} => {e}")
        priority = 3

    # ✅ 중복 검사: 해당 연/월 중 기간 겹치는 작업들만 확인
    end_date = start_date + timedelta(days=period - 1)
    monthly_tasks = FieldTodo.objects.filter(
        field=field,
        start_date__year=start_date.year,
        start_date__month=start_date.month
    )

    overlap_tasks = [
        t for t in monthly_tasks
        if t.start_date.date() <= end_date.date() and
           (t.start_date.date() + timedelta(days=t.period or 1) - timedelta(days=1)) >= start_date.date()
    ]
    if is_duplicate_by_cosine(task_data["task_name"], task_data.get("task_content", ""),overlap_tasks):
        print(f"[중복됨] {task_data['task_name']}")
        return
    
    task = FieldTodo.objects.create(
        owner=user,
        field=field,
        task_name=task_data["task_name"][:50],
        task_content=task_data["task_content"],
        priority=priority,
        period=period,
        cycle=cycle,
        is_pest=any(k in task_data["task_content"] for k in PEST_KEYWORDS),
        start_date=start_date
    )
    create_task_progress_entries(task)



# -------- 1. 월간 키워드 생성 및 저장 -------- #
def generate_month_keywords(field, base_date):
    prompt = f"""
작물: {field.crop_name}
월: {base_date.month}월
지역: {field.field_address}
농지 설명 : {field.description}
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
날짜: {base_date.strftime("%Y-%m-%d")}
작물: {field.crop_name}
위치: {field.field_address}
해당 월: {base_date.month}월
해당 월 주요 키워드: {', '.join(keywords)}
기후 요약: {weather}
지난 주 작업들: {summary}

당신은 전문 농업 컨설턴트입니다. 아래 정보를 바탕으로 향후 14일 간의 농작업 계획을 JSON 배열로 작성해 주세요.
작업은 실제 농업 현장에서 수행되는 방식처럼 현실적이고 구체적으로 생성해야 합니다.

[조건]
- 하루에 최대 2개 작업만 생성 가능
- 각 작업은 아래 필드를 포함해야 합니다:
  - `task_name`: 작업 이름
  - `task_content`: 실제 작업 설명
  - 'priority' : 작업의 우선 순위
  - `period`: 해당 작업이 걸리는 일수 (정수, 1~5일)
  - `cycle`: 반복 주기 (항상 0)
  - `start_date`: YYYY-MM-DD 형식의 시작일 (오늘부터 14일 이내)
- 같은 작업명이 반복되어도 무방하나, 날짜(작업 기간)는 겹치지 않아야 함
- 다른 작업명은 날짜가 겹쳐도 무관함
- 우선순위 1: 병해충 관련 작업 및 날씨 관련 대응 (예: 방제, 살충제, 병해충, 진딧물 등)
- 우선순위 2: 생장 및 환경관리 작업 (예: 통풍, 차광, 정지작업 등)
- 우선순위 3: 일반/루틴 작업 (예: 비료, 관수, 수확 등)

[판단 스텝]
1. 입력된 월({base_date.month})을 기준으로 현재 계절을 판별합니다. 예: 3~5월 → 봄, 6~8월 → 여름
2. 작물({field.crop_name})과 월 정보를 통해 생육 단계를 추론합니다.
3. 생육 단계와 월에 따라 일반적으로 수행되는 주요 작업을 도출합니다.
4. 제공된 키워드({', '.join(keywords)})를 참고하여 시기적으로 반드시 수행해야 하는 작업들을 우선 고려합니다.
5. 날씨 정보({weather})를 활용해 작업 일정을 조정합니다. 예: 비 오는 날 전날에 물주기를 수행
6. 최근 작업 내역({summary})을 참고해 동일 작업 간 최소 3~5일 이상 간격을 유지합니다.
7. 가장 중요한 작업을 앞쪽 날짜에 우선 배치합니다.

[출력 예시 형식]
[
  {{
    "task_name": "물주기",
    "task_content": "감자의 생장을 돕기 위해 물을 충분히 줍니다.",
    "priority" : 2
    "period": 2,
    "cycle": 0,
    "start_date": "2025-05-15"
  }},
  ...
]
설명 없이 JSON만 출력하세요.
"""



    response = openai.ChatCompletion.create(
        model=GPT,
        messages=[
            {"role": "system", "content": "너는 전문 농업 컨설턴트야야."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.4,
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
def generate_daily_tasks_for_field(user, field, pest_info, weather_info, base_date):
    prompt = f"""
오늘은 {base_date.strftime("%Y-%m-%d")}입니다.
작물: {field.crop_name}
위치: {field.field_address}
해당 월: {base_date.month}월
병해충 정보: {pest_info}
날씨 정보: {weather_info}

[역할]
당신은 병해충 대응에 특화된 농업 전문가입니다. 위 정보를 기반으로 오늘 반드시 수행해야 할 핵심 농작업들을 최대 3개 JSON 배열로 생성해 주세요.

[조건]
- 각 작업은 아래 필드를 포함해야 합니다:
  - `task_name`: 작업 이름
  - `task_content`: 구체적인 작업 설명
  - 'priority' : 작업의 우선 순위
  - `period`: 작업 소요 기간 (1~3일 정수)
  - `cycle`: 반복 주기 (항상 0)
  - `start_date`: 오늘 날짜(YYYY-MM-DD)
- 병해충 대응 작업이 최우선입니다. 그 외 작업은 날씨 조건이 좋을 경우 수행합니다.
- 우선순위 1: 병해충 관련 작업 및 날씨 관련 대응 (예: 방제, 살충제, 병해충, 진딧물 등)
- 우선순위 2: 생장 및 환경관리 작업 (예: 통풍, 차광, 정지작업 등)
- 우선순위 3: 일반/루틴 작업 (예: 비료, 관수, 수확 등)

[판단 스텝]
1. 작물({field.crop_name})과 오늘 날짜({today}) 기준으로 현재 시기의 병해충 위험도를 고려합니다.
2. 날씨({weather_info})가 비 또는 고온일 경우 병해충 방제, 물주기, 통풍 확보 등의 작업을 우선 고려합니다.
3. pest_info에 포함된 주요 병해충이 있다면, 해당 병해충에 대응하는 작업을 우선 출력합니다.
4. 하루 최대 3개 작업만 생성하며, 모두 오늘 실행 가능한 작업이어야 합니다.

[출력 예시 형식]
[
  {{
    "task_name": "병해충 방제",
    "task_content": "응애 발생 위험이 있어 살충제를 사용하여 방제합니다.",
    "priority" : 2
    "period": 1,
    "cycle": 0,
    "start_date": "2025-05-14"
  }},
  ...
]
설명 없이 JSON만 출력하세요.
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
def generate_monthly_tasks(user, field, keywords, base_date):
    today = datetime.today().date()
    prompt = f"""
오늘은 {base_date.strftime("%Y-%m-%d")}입니다.
작물: {field.crop_name}
위치: {field.field_address}
해당 월: {base_date.month}월
해당 월 주요 키워드: {', '.join(keywords)}

[역할]
당신은 월간 농업 계획을 수립하는 전문가입니다.
아래 정보를 바탕으로 이번 달 동안 수행해야 할 핵심 농작업들을 JSON 배열로 생성해주세요.

[조건]
- 모든 작업은 다음 필드를 포함해야 합니다:
  - `task_name`: 작업 이름
  - `task_content`: 작업 설명
  - 'priority' : 작업의 우선 순위
  - `period`: 작업 소요 기간 (1~5일)
  - `cycle`: 항상 0
  - `start_date`: 작업 시작일 (YYYY-MM-DD, 오늘부터 이달 말 사이)
- 하루에 작업이 반드시 존재할 필요는 없으며, 실질적으로 필요한 작업만 생성합니다.
- 중요도 및 계절성을 반영하여 작업을 간격 있게 배치해야 합니다.
- 우선순위 1: 병해충 관련 작업 및 날씨 관련 대응 (예: 방제, 살충제, 병해충, 진딧물 등)
- 우선순위 2: 생장 및 환경관리 작업 (예: 통풍, 차광, 정지작업 등)
- 우선순위 3: 일반/루틴 작업 (예: 비료, 관수, 수확 등)

[판단 스텝]
1. 월({today.month}) 기준 계절을 판별하고, 해당 작물({field.crop_name})의 일반적인 생육 단계를 추론합니다.
2. 월별 작업 주기 및 관행에 따라 작업을 간격 있게 배치합니다.
3. 주요 키워드({', '.join(keywords)})를 참고하여 핵심 작업을 빠짐없이 포함시킵니다.
4. 작업 간 날짜가 겹치지 않도록 period를 고려해 배치합니다.
5. 병해충/기후 변화가 심할 경우 주기적으로 물주기/방제 작업이 반복될 수 있습니다.

[출력 예시 형식]
[
  {{
    "task_name": "잡초 제거",
    "task_content": "감자 주변의 잡초를 제거하여 생육을 돕습니다.",
    "priority" : 2
    "period": 1,
    "cycle": 0,
    "start_date": "2025-05-18"
  }},
  ...
]
설명 없이 JSON만 출력하세요.
"""

    response = openai.ChatCompletion.create(
        model=GPT,
        messages=[{"role": "system", "content": "너는 월간 농업 계획 전문가야."},
                  {"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=5000
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
