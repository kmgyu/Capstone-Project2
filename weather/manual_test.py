import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from fieldmanage.models import Field
from weather.models import Weather
from weather.weather_api import get_combined_weather
from weather.utils import get_region_name_from_address

def run_weather_test():
    region_cache = {}
    for field in Field.objects.all():
        try:
            if isinstance(field.geometry, dict) and "coordinates" in field.geometry:
                lon, lat = field.geometry["coordinates"][0][0]
            else:
                print(f"[⚠️] {field.field_name}의 geometry가 없음 → 기본 좌표 사용")
                lat, lon = 35.145, 126.793  # 광주 치평동

            addr = field.field_address
            region = get_region_name_from_address(addr)

            if region in region_cache:
                print(f"[ℹ️] 이미 처리한 지역 {region} → 스킵")
                continue

            forecasts = get_combined_weather(lat, lon, addr)

            for forecast in forecasts:
                try:
                    obj, created = Weather.objects.update_or_create(
                        region_name=forecast["region_name"],
                        date=forecast["date"],
                        defaults={
                            "weather": forecast["weather"],
                            "temperature": forecast["temperature"],
                            "precipitation": forecast["precipitation"]
                        }
                    )
                    print(f"[{'신규' if created else '업데이트'}] {obj.region_name} - {obj.date} - {obj.weather}")
                except Exception as e:
                    print(f"[❌ 저장 실패] {forecast.get('region_name', '???')} - {e}")

            region_cache[region] = True

        except Exception as e:
            print(f"[❌] {field.field_name} 실패: {e}")