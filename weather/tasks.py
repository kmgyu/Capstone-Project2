from celery import shared_task
from fieldmanage.models import Field
from .models import Weather
from .weather_api import get_combined_weather
from datetime import timedelta
from django.utils import timezone

@shared_task
def fetch_and_store_all_weather():
    """
    모든 노지(Field)의 위도/경도와 주소를 기반으로 날씨를 수집하여 DB에 저장.
    같은 지역(region_name)은 중복 저장하지 않음.
    """
    region_cache = {}
    for field in Field.objects.all():
        lat = field.geometry['lat']
        lon = field.geometry['lon']
        addr = field.field_address
        region = addr.split()[0]

        if region in region_cache:
            continue

        try:
            forecasts = get_combined_weather(lat, lon, addr)
            for forecast in forecasts:
                Weather.objects.update_or_create(
                    region_name=forecast["region_name"],
                    date=forecast["date"],
                    defaults={
                        "weather": forecast["weather"],
                        "temperature": forecast["temperature"],
                        "precipitation": forecast["precipitation"]
                    }
                )
            region_cache[region] = True
        except Exception as e:
            print(f"[ERROR] {region} 날씨 저장 실패: {e}")

@shared_task
def delete_old_weather():
    """
    30일 이상 지난 오래된 날씨 데이터를 삭제함.
    """
    limit = timezone.now().date() - timedelta(days=30)
    Weather.objects.filter(date__lt=limit).delete()
