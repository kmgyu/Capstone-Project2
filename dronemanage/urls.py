# dronemanage/urls.py
from django.urls import path
from .views import UploadLogView, BatteryLogView, LocationLogView, AltitudeLogView, GPSStrengthLogView, FlightModeLogView

urlpatterns = [
    path('log/upload/', UploadLogView.as_view(), name='upload-log'),
    path('log/battery/', BatteryLogView.as_view()),
    path('log/location/', LocationLogView.as_view()),
    path('log/altitude/', AltitudeLogView.as_view()),
    path('log/gps/', GPSStrengthLogView.as_view()),
    path('log/mode/', FlightModeLogView.as_view()),
]
