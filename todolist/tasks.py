from .gpt_core import (
    generate_month_keywords,
    generate_biweekly_tasks,
    generate_daily_tasks_for_field,
    generate_monthly_tasks,
)
from .utils import (
    get_month_keywords,
    get_pest_summary,
    get_weather,
    get_weather_for_range,
    extract_weather_region
)

from celery import shared_task
from fieldmanage.models import Field
from django.contrib.auth import get_user_model
from datetime import datetime

User = get_user_model()


@shared_task
def run_generate_daily_tasks():
    base_date = datetime.today().date()
    users = User.objects.all()
    for user in users:
        fields = Field.objects.filter(owner=user)
        region = extract_weather_region(field.field_address)
        for field in fields:
            pest_info = get_pest_summary(field)
            weather_info = get_weather(region, base_date)
            generate_daily_tasks_for_field(user, field, pest_info, weather_info, base_date)


@shared_task
def run_generate_monthly_keywords_and_tasks():
    base_date = datetime.today().date()
    users = User.objects.all()
    for user in users:
        fields = Field.objects.filter(owner=user)
        for field in fields:
            keywords = generate_month_keywords(field) or []
            generate_monthly_tasks(user, field, keywords, base_date)


@shared_task
def run_generate_biweekly_tasks():
    base_date = datetime.today().date()
    users = User.objects.all()
    for user in users:
        fields = Field.objects.filter(owner=user)
        region = extract_weather_region(field.field_address)
        for field in fields:
            keywords = get_month_keywords(field)
            pest_info = get_pest_summary(field)
            weather_info = get_weather_for_range(region, base_date, days=14)
            generate_biweekly_tasks(user, field, pest_info, weather_info, keywords, base_date)

@shared_task
def run_generate_monthly_tasks():
    base_date = datetime.today().date()
    users = User.objects.all()
    for user in users:
        fields = Field.objects.filter(owner=user)
        for field in fields:
            keywords = get_month_keywords(field) # 이미 DB에 저장된 키워드 사용
            generate_monthly_tasks(user, field, keywords, base_date)