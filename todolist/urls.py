from django.urls import path
from .views import (
    FieldTodoDetailAPIView,
    FieldTodoListAPIView
)
from .tasks import create_task_from_gpt

urlpatterns = [
    # 사용자 기준 start~end date 할 일 목록 조회 및 생성
    # field_id 존재 시, field_id 또한 필터링 옵션으로 들어감
    path('todos/list/', FieldTodoListAPIView.as_view(), name='todo-list'),
    path('todos/<int:field_id>/list/', FieldTodoListAPIView.as_view(), name='todo-list-by-field'),

    # 특정 할 일 한 건 조회/수정/삭제
    path('todos/task/<int:task_id>/', FieldTodoDetailAPIView.as_view(), name='todo-detail'),
    
    # gpt에게 todo list 뽑아 오는 기능
    # test 코드는 주석처리하고 명시할 것
    # path("api/tasks/from-gpt/", create_task_from_gpt),
]
