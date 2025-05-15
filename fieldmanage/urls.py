from django.urls import path
from .views import FieldListAPIView, FieldDetailAPIView, GetGeometryAPIView

# ~/field
urlpatterns = [
    path('fields/', FieldListAPIView.as_view(), name='field-list'),
    path('fields/<int:pk>/', FieldDetailAPIView.as_view(), name='field-detail'),
    path('get-geometry/', GetGeometryAPIView.as_view(), name='get-geometry'),
]
