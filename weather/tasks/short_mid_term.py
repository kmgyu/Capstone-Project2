from celery import shared_task
from weather.models import Weather
from fieldmanage.models import Field
from weather.weather_api.short_mid_term import get_combined_weather
from weather.utils import get_region_name_from_address

@shared_task
def fetch_and_store_short_mid_term_weather():
    region_cache = set()

    for field in Field.objects.all():
        try:
            polygon = field.geometry['coordinates'][0]
            lon, lat = polygon[0]
            address = field.field_address
            region_name = get_region_name_from_address(address)

            if region_name in region_cache:
                continue

            forecasts = get_combined_weather(lat, lon, address)
            for forecast in forecasts:
                Weather.objects.update_or_create(
                    region_name=region_name,
                    date=forecast["date"],
                    defaults={
                        "weather": forecast["weather"],
                        "temperature_avg": forecast["temperature_avg"],
                        "precipitation": forecast["precipitation"]
                    }
                )
            region_cache.add(region_name)

        except Exception as e:
            print(f"[ERROR] {field.field_name} 지역 날씨 저장 실패: {e}")
