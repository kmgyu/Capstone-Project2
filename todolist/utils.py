from datetime import timedelta, datetime
from .models import TaskProgress, FieldTodo
from .serializers import FieldTodoSerializer
from weather.models import Weather
from fieldmanage.models import MonthlyKeyword
from collections import defaultdict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from konlpy.tag import Okt

def create_task_progress_entries(task: FieldTodo):
    if not task.start_date or not task.period:
        return

    for i in range(0, task.period):
        date = (task.start_date + timedelta(days=i)).date()
        TaskProgress.objects.get_or_create(
            task_id=task,
            date=date,
            defaults={'status': 'skip'}
        )

def extract_region(address: str) -> str:
    """
    주소에서 시/도(ex: 서울특별시, 광주광역시)만 추출
    """
    if not address:
        return ""

    # 공백 기준 첫 번째 토큰이 시/도인 경우
    return address.strip().split()[0]

def get_weather(region_name: str, target_date: datetime.date) -> str:
    try:
        weather = Weather.objects.get(region_name=region_name, date=target_date)
        return f"{weather.weather}, {weather.temperature_avg}°C, 강수량 {weather.precipitation}mm"
    except Weather.DoesNotExist:
        return "날씨 정보 없음"


def get_weather_for_range(region_name: str, start_date: datetime.date, days: int = 14) -> str:
    end_date = start_date + timedelta(days=days - 1)
    weather_qs = Weather.objects.filter(region_name=region_name, date__range=(start_date, end_date)).order_by("date")
    if not weather_qs.exists():
        return "날씨 정보 없음"
    return "\n".join(
        f"{weather.date.strftime('%Y-%m-%d')}: {weather.weather}, {weather.temperature}°C, {weather.precipitation}mm"
        for weather in weather_qs
    )


def get_month_keywords(field):
    today = datetime.today().date()
    qs = MonthlyKeyword.objects.filter(field_id=field, month=today.month, year=today.year)
    result = []
    for obj in qs:
        if isinstance(obj.keywords, list):
            for kw in obj.keywords:
                if isinstance(kw, dict) and 'keyword' in kw:
                    result.append(kw['keyword'])
                elif isinstance(kw, str):
                    result.append(kw)
    return result


def get_pest_summary(field):
    # TODO: 병해충 분석 로직 연결 시 여기에 구현
    return "진딧물, 응애 발생 기록 있음 (예시)"


okt = Okt()

def expand_tasks_by_date(todos):
    """
    모든 FieldTodo를 날짜별로 확장
    period=3이면 start_date부터 3일간 반복해서 해당 날짜에 추가
    """
    date_map = defaultdict(list)
    for task in todos:
        for i in range(task.period or 1):
            day = task.start_date.date() + timedelta(days=i)
            date_map[day].append(task)
    return date_map


def deduplicate_tasks_per_day(date_map, max_per_day=2, threshold=0.85):
    final_result = []

    for date in sorted(date_map.keys()):
        tasks = date_map[date]
        texts = [t.task_name for t in tasks]

        vectorizer = TfidfVectorizer(tokenizer=okt.morphs, token_pattern=None, ngram_range=(1, 2))
        tfidf_matrix = vectorizer.fit_transform(texts)
        sim_matrix = cosine_similarity(tfidf_matrix)

        used = [False] * len(tasks)
        kept = []

        for i in range(len(tasks)):
            if used[i]:
                continue
            base_task = tasks[i]
            kept.append(base_task)
            used[i] = True

            for j in range(i + 1, len(tasks)):
                if not used[j]:
                    print(f"→ [{date}] '{texts[i]}' vs '{texts[j]}' = {sim_matrix[i][j]:.4f}")
                    if sim_matrix[i][j] >= threshold:
                        used[j] = True

            if len(kept) >= max_per_day:
                break

        for task in kept:
            serialized = FieldTodoSerializer(task).data
            serialized["date"] = str(date)
            final_result.append(serialized)

    return final_result
