from django.urls import path
from .views import FieldListView, FieldDetailView, FieldTestView

# ~/field
urlpatterns = [
    path('fields/', FieldListView.as_view(), name='field-list'),
    path('fields/<int:pk>/', FieldDetailView.as_view(), name='field-detail'),
    path('test/', FieldTestView.as_view(), name='field-test'),
]
