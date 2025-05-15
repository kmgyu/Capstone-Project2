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
from datetime import datetime

User = get_user_model()


@shared_task
def run_generate_daily_tasks():
    base_date = datetime.today().date()
    users = User.objects.all()
    for user in users:
        fields = Field.objects.filter(owner=user)
        for field in fields:
            pest_info = get_pest_summary(field)
            weather_info = get_weather(field.field_address, base_date)
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
        for field in fields:
            keywords = get_month_keywords(field)
            pest_info = get_pest_summary(field)
            weather_info = get_weather_for_range(field.field_address, base_date, days=14)
            generate_biweekly_tasks(user, field, pest_info, weather_info, keywords, base_date)
