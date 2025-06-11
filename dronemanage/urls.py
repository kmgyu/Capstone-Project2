from django.urls import path
from . import views

urlpatterns = [
    path('log/upload/', views.UploadLogView.as_view(), name='upload-log'),
    path('log/battery/', views.BatteryLogView.as_view(), name='battery-log'),
    path('log/location/', views.LocationLogView.as_view(), name='location-log'),
    path('log/altitude/', views.AltitudeLogView.as_view(), name='altitude-log'),
    path('log/gps-strength/', views.GPSStrengthLogView.as_view(), name='gps-strength-log'),
    path('log/flight-mode/', views.FlightModeLogView.as_view(), name='flight-mode-log'),
    path('log/daily-flight-time/', views.DailyFlightTimeView.as_view(), name='daily-flight-time'),
    path('log/error-log/', views.DroneErrorLogView.as_view(), name='error-log'),
    path('log/flight-status/', views.FlightStatusView.as_view(), name='flight-status'),
    path('register/', views.DroneRegisterView.as_view(), name='drone-register'),
    path('claim-drone/', views.ClaimDroneAPIView.as_view(), name='claim-drone'),
    path('my-drones/', views.MyDroneListAPIView.as_view(), name='my-drones'),
    path('<int:drone_id>/', views.UpdateDroneAPIView.as_view(), name='update-drone'),
    path('delete/<int:drone_id>/', views.DeleteDroneAPIView.as_view(), name='delete-drone'),
    # path('generate-waypoint/', views.WaypointGenerationView.as_view(), name='generate-waypoint'),
]
