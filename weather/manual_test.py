import os
import django

# ✅ Django settings 로딩 먼저
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

# ⏬ 반드시 setup 이후에 import
from fieldmanage.models import Field
from weather.models import Weather
from weather.weather_api import get_combined_weather
from weather.utils import get_region_name_from_address


def run_weather_test():
    region_cache = {}

    for field in Field.objects.all():
        try:
            # ✅ geometry 값이 dict인지 확인 후 좌표 추출
            if isinstance(field.geometry, dict) and "coordinates" in field.geometry:
                first_point = field.geometry["coordinates"][0][0]
                if isinstance(first_point, list) and len(first_point) == 2:
                    lon, lat = first_point
                else:
                    raise ValueError("geometry['coordinates'][0][0]가 유효하지 않음")
            else:
                print(f"[⚠️] {field.field_name}의 geometry가 비어있거나 잘못됨 → 기본 좌표 사용")
                lat, lon = 35.145, 126.793  # 광주 치평동 좌표

            addr = field.field_address
            region = get_region_name_from_address(addr)

            if region in region_cache:
                print(f"[ℹ️] 이미 처리한 지역 {region} → 스킵")
                continue

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

            print(f"[✅] {region} 날씨 저장 완료")
            region_cache[region] = True

        except Exception as e:
            print(f"[❌] {field.field_name} 실패: {e}")