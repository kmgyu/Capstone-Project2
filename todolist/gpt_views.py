from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from datetime import datetime
from fieldmanage.models import Field
from django.contrib.auth import get_user_model
from .gpt_core import (
    generate_month_keywords,
    generate_biweekly_tasks,
    generate_monthly_tasks,
    generate_daily_tasks_for_field,
)
from .utils import (
    get_month_keywords,
    get_pest_summary,
    get_weather,
    get_weather_for_range
)

User = get_user_model()

# 전부 post 요청
@csrf_exempt
def generate_keywords(request):
    data = json.loads(request.body)
    field = Field.objects.get(field_id=data["field_id"])
    keywords = generate_month_keywords(field)
    return JsonResponse({"keywords": keywords})


@csrf_exempt
def manual_generate_daily(request):
    data = json.loads(request.body)
    field = Field.objects.get(field_id=data["field_id"])
    user = User.objects.get(id=data["owner_id"])
    today = datetime.today().date()
    weather = get_weather(field.field_address, today)
    keywords = get_month_keywords(field)
    pest_info = get_pest_summary(field)
    generate_daily_tasks_for_field(user, field, pest_info, weather)
    return JsonResponse({"status": "daily generated"})


@csrf_exempt
def manual_generate_biweekly(request):
    data = json.loads(request.body)
    field = Field.objects.get(field_id=data["field_id"])
    user = User.objects.get(id=data["owner_id"])
    today = datetime.today().date()
    weather = get_weather_for_range(field.field_address, today)
    keywords = get_month_keywords(field)
    pest_info = get_pest_summary(field)
    base_date = datetime.today().date()
    generate_biweekly_tasks(user, field, pest_info, weather, keywords, base_date)
    return JsonResponse({"status": "biweekly generated"})


@csrf_exempt
def manual_generate_monthly(request):
    data = json.loads(request.body)
    field = Field.objects.get(field_id=data["field_id"])
    user = User.objects.get(id=data["owner_id"])
    today = datetime.today().date()
    keywords = get_month_keywords(field)
    generate_monthly_tasks(user, field, keywords)
    return JsonResponse({"status": "monthly generated"})






