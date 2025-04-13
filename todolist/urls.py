from django.urls import path
from .views import FieldTodoListView, FieldTodoDetailView

urlpatterns = [
    path('todos', FieldTodoListView.as_view(), name='todo-list'),
    path('todos/<int:pk>', FieldTodoDetailView.as_view(), name='todo-detail'),
    path('todos/create', FieldTodoDetailView.as_view(), name='todo-create'),
]
