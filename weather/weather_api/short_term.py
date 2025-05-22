import datetime
import requests
from django.conf import settings
from weather.models import HourlyWeather
from weather.utils import convert_to_grid

def get_ultra_short_forecast_all(lat, lon):
    nx, ny = convert_to_grid(lat, lon)
    now = datetime.datetime.now()
    minute = now.minute

    if minute < 40:
        base_time = (now - datetime.timedelta(hours=1)).replace(minute=0).strftime("%H%M")
        print(base_time)
    else:
        base_time = now.replace(minute=0).strftime("%H%M")
    base_date = now.strftime("%Y%m%d")
    print("🗓️ base_date =", base_date)
    api_key = getattr(settings, "WEATHER_API_KEY", None)
    url = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst"
    params = {
        "serviceKey": api_key,
        "dataType": "JSON",
        "base_date": base_date,
        "base_time": base_time,
        "nx": nx,
        "ny": ny,
        "numOfRows": 1000
    }

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        items = response.json()['response']['body']['items']['item']
    except Exception as e:
        print("❌ 기상청 API 호출 오류:", e)
        return None

    print(f"📦 받은 예보 item 수: {len(items)}")
    print("✅ base_date =", base_date)

    result = {}
    for item in items:
        print("🕓 예보 시각 =", item['fcstDate'], item['fcstTime'], item['category'])

        if item['fcstDate'] != base_date:
            continue

        hour = int(item['fcstTime'][:2])
        category = item['category']
        value = item['fcstValue']

        if hour not in result:
            result[hour] = {"TMP": None, "PTY": None, "SKY": None}

        if category == "T1H":  # ✅ T1H를 TMP로 간주
            result[hour]["TMP"] = value
        elif category in result[hour]:
            result[hour][category] = value

    cleaned = {}
    for hour, data in result.items():
        print(f"[디버깅] {hour}시 TMP 값:", data.get("TMP"))

        try:
            pty = int(data.get("PTY") or 0)
        except:
            pty = 0
        try:
            sky = int(data.get("SKY") or 1)
        except:
            sky = 1

        if pty == 0:
            weather = {1: "맑음", 3: "구름많음", 4: "흐림"}.get(sky, "맑음")
        else:
            weather = {1: "비", 2: "비/눈", 3: "눈", 4: "소나기"}.get(pty, "비")

        tmp = data.get("TMP")
        try:
            temperature = float(tmp) if tmp is not None else 0.0
        except:
            temperature = 0.0

        cleaned[hour] = {
            "weather": weather,
            "temperature": temperature,
            "precipitation": 0.0
        }

    return base_date, cleaned


def get_or_create_hourly_weather(region_name, lat, lon):
    today = datetime.date.today()
    queryset = HourlyWeather.objects.filter(region_name=region_name, date=today)
    if queryset.exists():
        return queryset

    base_date, forecast_by_hour = get_ultra_short_forecast_all(lat, lon)
    if not forecast_by_hour:
        return None

    for hour, data in forecast_by_hour.items():
        HourlyWeather.objects.update_or_create(
            region_name=region_name,
            date=today,
            hour=hour,
            defaults={
                "temperature": data["temperature"],
                "weather": data["weather"],
                "precipitation": data["precipitation"]
            }
        )

    return HourlyWeather.objects.filter(region_name=region_name, date=today)