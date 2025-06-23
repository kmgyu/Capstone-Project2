from datetime import timedelta, datetime
from .models import TaskProgress, FieldTodo
from weather.models import Weather
from fieldmanage.models import MonthlyKeyword
from datetime import datetime

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
    qs = MonthlyKeyword.objects.filter(field=field, month=today.month, year=today.year)
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