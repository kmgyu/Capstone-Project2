from django.urls import path
from .views import (
    FieldTodoListCreateAPIView,
    FieldTodoDetailAPIView,
    FieldTodoUserListAPIView
)
from .tasks import create_task_from_gpt

urlpatterns = [
    # 사용자 기준 전체 할 일 목록 조회
    path('todos/user/', FieldTodoUserListAPIView.as_view(), name='todo-user-list'),

    # 특정 필드의 할 일 목록 조회 및 생성
    path('todos/field/<int:field_id>/', FieldTodoListCreateAPIView.as_view(), name='todo-field-list-create'),

    # 특정 할 일 한 건 조회/수정/삭제
    path('todos/task/<int:task_id>/', FieldTodoDetailAPIView.as_view(), name='todo-detail'),
    
    # gpt에게 todo list 뽑아 오는 기능
    # test 코드는 주석처리하고 명시할 것
    # path("api/tasks/from-gpt/", create_task_from_gpt),
]
