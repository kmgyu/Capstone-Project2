from celery import shared_task
from weather.models import Weather
from weather.weather_api.short_mid_term import get_combined_weather

@shared_task
def fetch_and_store_short_mid_term_weather():
    region_set = Weather.objects.values("region_name", "lat", "lon").distinct()

    for region in region_set:
        region_name = region["region_name"]
        lat = region.get("lat")
        lon = region.get("lon")

        if lat is None or lon is None:
            print(f"[⚠️ 경고] {region_name} 위치 정보 누락 → 스킵")
            continue

        try:
            forecasts = get_combined_weather(lat, lon, region_name)
            for forecast in forecasts:
                Weather.objects.update_or_create(
                    region_name=forecast["region_name"],
                    date=forecast["date"],
                    defaults={
                        "weather": forecast["weather"],
                        "temperature_avg": forecast["temperature_avg"],
                        "precipitation": forecast["precipitation"],
                        "lat": forecast["lat"],
                        "lon": forecast["lon"]
                    }
                )
            print(f"✅ {region_name} 날씨 갱신 완료")
        except Exception as e:
            print(f"[ERROR] {region_name} 날씨 갱신 실패: {str(e)}")
