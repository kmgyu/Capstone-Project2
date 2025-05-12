from django.urls import path
from . import views

urlpatterns = [
    path('upload-log/', views.upload_drone_log, name='upload_drone_log'),
    path('send-mission/', views.send_flight_mission, name='send_flight_mission'),
    path('status/', views.get_drone_status, name='get_drone_status_by_field'),  # ← 추가된 부분
]