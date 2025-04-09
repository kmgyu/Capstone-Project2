from django.urls import path
from .views import FieldListView, FieldDetailView
from rest_framework_simplejwt.views import TokenRefreshView

# ~/field
urlpatterns = [
    path('fields/', FieldListView.as_view(), name='field-list'),
    path('fields/<int:pk>/', FieldDetailView.as_view(), name='field-detail'),
    path("refresh/", TokenRefreshView.as_view()), # jwt 토큰 재발급
]
