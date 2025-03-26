from django.urls import path
from .views import FieldListView, FieldDetailView

# ~/field
urlpatterns = [
    path('fields/', FieldListView.as_view(), name='field-list'),
    path('fields/<int:pk>/', FieldDetailView.as_view(), name='field-detail'),
]
