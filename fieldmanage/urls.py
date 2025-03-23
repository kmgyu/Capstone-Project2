from django.urls import path
from .views import FieldCreateView

urlpatterns = [
    path('create/', FieldCreateView.as_view(), name='create-field'),
]
