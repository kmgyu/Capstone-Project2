from django.urls import path
from weather.views.short_term import RealtimeShortTermWeatherAPIView
from weather.views.short_mid_term import DailyTenDaysWeatherAPIView

urlpatterns = [
    path('short-now/', RealtimeShortTermWeatherAPIView.as_view(), name='ultra_short_weather'),
    path('daily-10days/', DailyTenDaysWeatherAPIView.as_view(), name='daily_10day_forecast'),
]