# todo/tasks.py
# from .models import Todo
# from datetime import date

# def auto_add_todo():
#     Todo.objects.create(
#         title="자동 생성 Todo",
#         description="이건 시스템이 자동으로 생성했어요.",
#         due_date=date.today()
#     )


import openai
import json
import re
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from fieldmanage.models import Field
from .models import FieldTodo
from django.contrib.auth import get_user_model
from django.conf import settings

User = get_user_model()
openai.api_key = settings.OPENAI_API_KEY

# 병해충 키워드 리스트
PEST_KEYWORDS = ["진딧물", "응애", "방제", "병해충", "살충제", "살균제", "해충", "전염병", "병해", "충해"]

# 기간 관련 패턴 (예: 2일, 1주, 3개월 등)
PERIOD_PATTERN = r"(\d+)(일|주|개월|달|시간)"

# 주기 관련 표현
CYCLE_KEYWORDS = {
    "매일": 1,
    "매주": 7,
    "격주": 14,
    "매달": 30,
    "한 달마다": 30
}


def extract_period_days(text):
    match = re.search(PERIOD_PATTERN, text)
    if not match:
        return None
    num = int(match.group(1))
    unit = match.group(2)
    if unit == "일":
        return num
    elif unit == "주":
        return num * 7
    elif unit in ["개월", "달"]:
        return num * 30
    elif unit == "시간":
        return max(1, round(num / 24))  # 최소 1일
    return None


def extract_cycle_days(text):
    for keyword, days in CYCLE_KEYWORDS.items():
        if keyword in text:
            return days
    return None


@csrf_exempt
def create_task_from_gpt(request):
    if request.method == "POST":
        data = json.loads(request.body)
        message = data.get("message")
        owner_id = data.get("owner_id")
        field_id = data.get("field_id")

        if not (message and owner_id and field_id):
            return JsonResponse({"error": "message, owner_id, field_id는 필수입니다."}, status=400)

        # GPT 호출
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "너는 농업 전문가야. 입력에 따라 구체적인 농작업을 설명해줘."},
                {"role": "user", "content": message}
            ],
            max_tokens = 300
        )

        gpt_content = response['choices'][0]['message']['content']

        # 분석
        is_pest = any(keyword in gpt_content for keyword in PEST_KEYWORDS)
        period = extract_period_days(gpt_content)
        cycle = extract_cycle_days(gpt_content)

        # DB 저장
        try:
            owner = User.objects.get(id=owner_id)
            field = Field.objects.get(id=field_id)
        except (User.DoesNotExist, Field.DoesNotExist):
            return JsonResponse({"error": "owner_id 또는 field_id가 존재하지 않습니다."}, status=404)

        task = FieldTodo.objects.create(
            owner=owner,
            field=field,
            task_name=message[:100],
            task_content=gpt_content,
            is_pest=is_pest,
            period=period,
            cycle=cycle
        )

        return JsonResponse({
            "task_id": task.task_id,
            "task_name": task.task_name,
            "task_content": task.task_content,
            "is_pest": task.is_pest,
            "period": task.period,
            "cycle": task.cycle
        })

    return JsonResponse({"error": "POST 요청만 지원합니다."}, status=405)
