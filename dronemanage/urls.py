# dronemanage/urls.py
from django.urls import path
from .views import UploadLogView, DroneLogListView

urlpatterns = [
    path('upload/log/', UploadLogView.as_view(), name='upload-log'),
    path('logs/', DroneLogListView.as_view(), name='log-list'),
]
