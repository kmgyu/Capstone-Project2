import datetime
import requests
from django.conf import settings
from weather.utils import convert_to_grid, get_region_name_from_address

MID_TERM_REGION_CODE = {
    "서울특별시": {"land": "11B00000", "temp": "11B10101"},
    "인천광역시": {"land": "11B00000", "temp": "11B20201"},
    "경기도": {"land": "11B00000", "temp": "11B20601"},
    "강원도 영서": {"land": "11D10000", "temp": "11D10301"},
    "강원도 영동": {"land": "11D20000", "temp": "11D20501"},
    "충청북도": {"land": "11C10000", "temp": "11C10301"},
    "대전광역시": {"land": "11C20000", "temp": "11C20401"},
    "세종특별자치시": {"land": "11C20000", "temp": "11C20404"},
    "충청남도": {"land": "11C20000", "temp": "11C20402"},
    "전라북도": {"land": "11F10000", "temp": "11F10201"},
    "광주광역시": {"land": "11F20000", "temp": "11F20501"},
    "전라남도": {"land": "11F30000", "temp": "11F30401"},
    "대구광역시": {"land": "11H10000", "temp": "11H10701"},
    "경상북도": {"land": "11H10000", "temp": "11H10501"},
    "부산광역시": {"land": "11H20000", "temp": "11H20201"},
    "울산광역시": {"land": "11H20000", "temp": "11H20101"},
    "경상남도": {"land": "11H20000", "temp": "11H20301"},
    "제주특별자치도": {"land": "11G00000", "temp": "11G00201"},
}

def round_to_nearest_3hour(now):
    hour = now.hour
    return f"{(hour // 3) * 100:04d}"  # 0~23 → 0000, 0300, 0600...

def get_short_term(lat, lon):
    nx, ny = convert_to_grid(lat, lon)
    now = datetime.datetime.now()
    base_date = now.strftime("%Y%m%d")
    base_time = round_to_nearest_3hour(now)

    params = {
        "serviceKey": getattr(settings, "WEATHER_API_KEY", None),
        "dataType": "JSON",
        "base_date": base_date,
        "base_time": base_time,
        "nx": nx,
        "ny": ny,
        "numOfRows": 1000
    }

    try:
        items = requests.get(
            "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst",
            params=params).json()['response']['body']['items']['item']
    except Exception as e:
        print("[ERROR] get_short_term API 실패:", e)
        return []

    # ✅ 날짜별로 TMP, SKY, PTY, POP 분류
    result = {}
    for item in items:
        date = item['fcstDate']
        category = item['category']
        value = item['fcstValue']
        if date not in result:
            result[date] = {"TMP": [], "SKY": [], "PTY": [], "POP": []}
        if category in result[date]:
            try:
                result[date][category].append(float(value))
            except:
                continue

    # ✅ 일자별 평균 기온과 날씨 텍스트 추출
    summary = []
    for date, values in result.items():
        temp = sum(values['TMP']) / len(values['TMP']) if values['TMP'] else 0.0
        rain = max(values['POP']) if values['POP'] else 0.0
        pty = int(max(values['PTY'], default=0))
        sky = int(max(values['SKY'], default=1))

        if pty == 0:
            weather = {1: "맑음", 3: "구름많음", 4: "흐림"}.get(sky, "맑음")
        else:
            weather = {1: "비", 2: "비/눈", 3: "눈", 4: "소나기"}.get(pty, "비")

        summary.append({
            "date": datetime.datetime.strptime(date, "%Y%m%d").date(),
            "temperature_avg": temp,
            "precipitation": rain,
            "weather": weather
        })

    return summary


def get_mid_term(region_name):
    main_region = region_name.split(",")[0].strip()
    code = MID_TERM_REGION_CODE.get(main_region)
    if not code:
        return []

    today = datetime.datetime.now()
    tmFc = (today - datetime.timedelta(days=1)).strftime("%Y%m%d") + "0600"

    try:
        land_item = requests.get(
            "http://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst",
            params={
                "serviceKey": getattr(settings, "WEATHER_API_KEY", None),
                "dataType": "JSON", "regId": code["land"], "tmFc": tmFc
            }).json()['response']['body']['items']['item'][0]

        temp_item = requests.get(
            "http://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa",
            params={
                "serviceKey": getattr(settings, "WEATHER_API_KEY", None),
                "dataType": "JSON", "regId": code["temp"], "tmFc": tmFc
            }).json()['response']['body']['items']['item'][0]
    except Exception as e:
        print("[ERROR] get_mid_term API 실패:", e)
        return []

    result = []
    for i in range(4, 8):
        date = today.date() + datetime.timedelta(days=i)
        ta_min = int(temp_item.get(f"taMin{i}", 0))
        ta_max = int(temp_item.get(f"taMax{i}", 0))
        temp_avg = (ta_min + ta_max) / 2
        weather = land_item.get(f"wf{i}Am") or land_item.get(f"wf{i}Pm") or "정보없음"

        result.append({
            "date": date,
            "temperature_avg": temp_avg,
            "precipitation": 0,
            "weather": weather
        })

    return result


def get_combined_weather(lat, lon, region_name):
    short_term = get_short_term(lat, lon)
    mid_term = get_mid_term(region_name)

    short_dict = {item["date"]: item for item in short_term}
    mid_dict = {item["date"]: item for item in mid_term}

    combined = []
    today = datetime.date.today()
    for i in range(0, 8):
        date = today + datetime.timedelta(days=i)

        if date in short_dict:
            forecast = short_dict[date]
        elif date in mid_dict:
            forecast = mid_dict[date]
        else:
            forecast = {
                "date": date,
                "weather": "정보없음",
                "temperature_avg": 0.0,
                "precipitation": 0.0
            }

        forecast["region_name"] = region_name
        forecast["lat"] = lat
        forecast["lon"] = lon
        combined.append(forecast)

    print(f"[DEBUG] get_combined_weather: region_name={region_name}, lat={lat}, lon={lon}")
    return combined