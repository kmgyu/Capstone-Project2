from django.urls import path
from .views import (
    FieldTodoDetailAPIView,
    FieldTodoListAPIView,
    TaskProgressUpdateAPIView,
    MonthlyFieldTodoAPIView,
    AllFieldTodosAPIView,
    DailyTodosAPIView
)
from todolist import gpt_views

# from .tasks import create_task_from_gpt

urlpatterns = [
    # 사용자 기준 start~end date 할 일 목록 조회 및 생성
    
    # 사용자 노지에 등록된 모든 할 일을 조회
    path('todos/all/', AllFieldTodosAPIView.as_view(), name='all-field-todos'),
    
    # 사용자 노지에 등록된 특정 날짜의 모든 할 일을 조회
    path('todos/all/date/', DailyTodosAPIView.as_view(), name='all-date-todos'),
    
    # 모든 할 일 조회 및 파라미터 추가 시 기간 필터링 후 조회(GET), 할 일 생성(POST)
    path('todos/<int:field_id>/list/', FieldTodoListAPIView.as_view(), name='todo-list-by-field'),
    
    # 한달 할 일 조회
    path('todos/monthly/<int:field_id>/', MonthlyFieldTodoAPIView.as_view()),

    # 특정 할 일 한 건 조회/수정/삭제
    path('todos/task/<int:task_id>/', FieldTodoDetailAPIView.as_view(), name='todo-detail'),
    
    # 진행도 업데이트
    path('todos/progress/<int:task_id>/', TaskProgressUpdateAPIView.as_view()),
    
    # gpt에게 todo list 뽑아 오는 기능
    # test 코드는 주석처리하고 명시할 것
    # path("api/tasks/from-gpt/", create_task_from_gpt),
    path("gpt/keywords/", gpt_views.generate_keywords),
    path("gpt/daily/", gpt_views.manual_generate_daily),
    path("gpt/biweekly/", gpt_views.manual_generate_biweekly),
    path("gpt/monthly/", gpt_views.manual_generate_monthly),
]
