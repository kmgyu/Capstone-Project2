from django.urls import path
from weather.views.short_term import short_term_view_get_realtime_weather
from weather.views.short_mid_term import short_mid_term_view_get_todo_weather

urlpatterns = [
    path('short-now/', short_term_view_get_realtime_weather, name='ultra_short_weather'),  # 초단기 실시간 예보
    path('daily-10days/', short_mid_term_view_get_todo_weather, name='daily_10day_forecast'),  # 단기+중기 (총 10일치)
]
