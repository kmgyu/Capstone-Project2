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
)

from celery import shared_task
from fieldmanage.models import Field
from django.contrib.auth import get_user_model
from django.utils.timezone import localtime

User = get_user_model()


@shared_task
def run_generate_daily_tasks():
    today = localtime().date()
    users = User.objects.all()
    for user in users:
        fields = Field.objects.filter(owner=user)
        for field in fields:
            pest_info = get_pest_summary(field)
            weather_info = get_weather(field.field_address, today)
            generate_daily_tasks_for_field(user, field, pest_info, weather_info)


@shared_task
def run_generate_monthly_keywords_and_tasks():
    today = localtime().date()
    users = User.objects.all()
    for user in users:
        fields = Field.objects.filter(owner=user)
        for field in fields:
            keywords = generate_month_keywords(field) or []
            generate_monthly_tasks(user, field, keywords)


@shared_task
def run_generate_biweekly_tasks():
    today = localtime().date()
    users = User.objects.all()
    for user in users:
        fields = Field.objects.filter(owner=user)
        for field in fields:
            keywords = get_month_keywords(field)
            pest_info = get_pest_summary(field)
            weather_info = get_weather_for_range(field.field_address, today, days=14)
            generate_biweekly_tasks(user, field, pest_info, weather_info, keywords, today)
