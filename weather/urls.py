from django.urls import path
from .views import send_weather_response_for_user

urlpatterns = [
    path('response/', send_weather_response_for_user, name='weather_response_for_user'),
]