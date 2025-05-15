import datetime
import requests
from django.conf import settings
from weather.utils import convert_to_grid

def get_ultra_short_forecast(lat, lon):
    # 위경도를 기상청 격자 좌표로 변환
    nx, ny = convert_to_grid(lat, lon)

    now = datetime.datetime.now()
    minute = now.minute

    if minute < 40:
        base_time = (now - datetime.timedelta(hours=1)).replace(minute=0).strftime("%H%M")
    else:
        base_time = now.replace(minute=0).strftime("%H%M")
    base_date = now.strftime("%Y%m%d")

    # 기상청 API Key 가져오기
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

    result = {}
    for item in items:
        if item['fcstDate'] != base_date:
            continue

        hour = int(item['fcstTime'][:2])
        category = item['category']
        value = item['fcstValue']

        if hour not in result:
            result[hour] = {"TMP": None, "PTY": None, "SKY": None}

        if category in result[hour]:
            result[hour][category] = value

    if not result:
        print("❗ 예보 결과 없음")
        return None

    latest_hour = max(result.keys(), default=None)
    if latest_hour is None or not result.get(latest_hour):
        print("❗ 최신 시간대 예보 없음")
        return None

    data = result[latest_hour]

    # 날씨 텍스트 변환
    try:
        pty = int(data.get("PTY") or 0)
    except (TypeError, ValueError):
        pty = 0
    try:
        sky = int(data.get("SKY") or 1)
    except (TypeError, ValueError):
        sky = 1

    if pty == 0:
        weather = {1: "맑음", 3: "구름많음", 4: "흐림"}.get(sky, "맑음")
    else:
        weather = {1: "비", 2: "비/눈", 3: "눈", 4: "소나기"}.get(pty, "비")

    # TMP가 None일 경우 대비
    tmp = data.get("TMP")
    try:
        temperature = float(tmp) if tmp is not None else 0.0
    except (TypeError, ValueError):
        temperature = 0.0

    return {
        "date": base_date,
        "hour": latest_hour,
        "temperature": temperature,
        "weather": weather
    }