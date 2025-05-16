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

    for i in range(task.period):
        date = (task.start_date + timedelta(days=i)).date()
        TaskProgress.objects.get_or_create(
            task_id=task,
            date=date,
            defaults={'status': 'skip'}
        )


def get_weather(region_name: str, target_date: datetime.date) -> str:
    try:
        weather = Weather.objects.get(region_name=region_name, date=target_date)
        return f"{weather.weather}, {weather.temperature}°C, 강수량 {weather.precipitation}mm"
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
    FieldTodo 리스트를 날짜별로 확장
    예: period=3이면 start_date 기준으로 3일치 각 날짜에 포함시킴
    """
    date_map = defaultdict(list)
    for task in todos:
        for i in range(task.period or 1):
            day = (task.start_date.date() + timedelta(days=i))
            date_map[day].append(task)
    return date_map


def deduplicate_tasks_per_day(date_map, max_per_day=2, threshold=0.85):
    final_result = []
    task_history = defaultdict(list)  # 날짜별 유사 그룹 추적

    sorted_dates = sorted(date_map.keys())

    for i, date in enumerate(sorted_dates):
        tasks = date_map[date]
        seen_clusters = []

        for task in sorted(tasks, key=lambda x: (x.priority, -x.period)):
            text1 = f"{task.task_name} {task.task_content or ''}"

            # 유사 그룹 체크
            is_dup = False
            for prev in seen_clusters:
                sim = cosine_similarity(
                    TfidfVectorizer(tokenizer=okt.morphs, token_pattern=None).fit_transform([text1, prev])
                )[0, 1]
                if sim >= threshold:
                    is_dup = True
                    break

            # ✅ 전날에도 같은 유사 그룹 있었는지 확인
            if i > 0:
                prev_date = sorted_dates[i - 1]
                for prev_text in task_history[prev_date]:
                    sim = cosine_similarity(
                        TfidfVectorizer(tokenizer=okt.morphs, token_pattern=None).fit_transform([text1, prev_text])
                    )[0, 1]
                    if sim >= threshold:
                        is_dup = True
                        break

            if not is_dup:
                seen_clusters.append(text1)
                task_history[date].append(text1)
                serialized = FieldTodoSerializer(task).data
                serialized["date"] = str(date)
                final_result.append(serialized)

            if len(seen_clusters) >= max_per_day:
                break

    return final_result