from django.urls import path
from .views import UserTodoListAPIView, FieldTodoListAPIView, FieldTodoCreateAPIView,FieldTodoDetailAPIView

    
urlpatterns = [
    path('todos/', UserTodoListAPIView.as_view(), name='user-todo-list'),
    path('todos/field/<int:field_id>/', FieldTodoListAPIView.as_view(), name='field-todo-list'),
    path('todos/create/', FieldTodoCreateAPIView.as_view(), name='todo-create'),
    path('todos/<int:task_id>/', FieldTodoDetailAPIView.as_view(), name='todo-detail'),
]
