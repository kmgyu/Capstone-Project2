from celery import shared_task
from weather.models import HourlyWeather, Weather
from fieldmanage.models import Field
from weather.weather_api.short_term import get_ultra_short_forecast
from weather.weather_api.short_mid_term import get_combined_weather
from weather.utils import get_region_name_from_address
from django.utils import timezone

@shared_task
def short_term_task_fetch_and_store_hourly_weather():
    today = timezone.now().date()
    region_cache = set()

    for field in Field.objects.all():
        try:
            polygon = field.geometry['coordinates'][0]
            lon, lat = polygon[0]
            address = field.field_address
            region_name = get_region_name_from_address(address)

            # 초단기 날씨 저장
            forecast = get_ultra_short_forecast(lat, lon)
            if forecast:
                HourlyWeather.objects.update_or_create(
                    region_name=region_name,
                    date=today,
                    hour=forecast['hour'],
                    defaults={
                        'weather': forecast['weather'],
                        'temperature': forecast['temperature'],
                        'precipitation': 0
                    }
                )

                # 단기+중기 예보 최초 저장
                existing = Weather.objects.filter(region_name=region_name, date=today)
                if not existing.exists():
                    forecasts = get_combined_weather(lat, lon, address)
                    for f in forecasts:
                        Weather.objects.update_or_create(
                            region_name=region_name,
                            date=f["date"],
                            defaults={
                                "weather": f["weather"],
                                "temperature_avg": f["temperature_avg"],
                                "precipitation": f["precipitation"]
                            }
                        )

        except Exception as e:
            print(f"[ERROR] {field.field_name} 초단기/단기+중기 날씨 저장 실패: {e}")
