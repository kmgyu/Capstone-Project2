from .gpt_core import (
    generate_month_keywords,
    generate_biweekly_tasks,
    generate_daily_tasks_for_field,
    generate_monthly_tasks,
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
            # 더미 데이터: 추후 병해충 및 날씨 API 연동 예정
            generate_daily_tasks_for_field(
                user,
                field,
                pest_info="진딧물 관찰됨 (더미)",
                weather_info="흐리고 습함 (더미)",
            )


@shared_task
def run_generate_monthly_keywords_and_tasks():
    users = User.objects.all()
    for user in users:
        fields = Field.objects.filter(owner=user)
        for field in fields:
            keywords = generate_month_keywords(field)
            generate_monthly_tasks(user, field, keywords)


@shared_task
def run_generate_biweekly_tasks():
    today = localtime().date()
    users = User.objects.all()
    for user in users:
        fields = Field.objects.filter(owner=user)
        for field in fields:
            keywords = generate_month_keywords(field)
            generate_biweekly_tasks(user, field, today, keywords)
