import requests
import datetime
from django.conf import settings
from .utils import convert_to_grid, get_region_name_from_address

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
    "제주특별자치도": {"land": "11G00000", "temp": "11G00201"}
}

def get_short_term(lat, lon):
    nx, ny = convert_to_grid(lat, lon)
    now = datetime.datetime.now()
    base_date = now.strftime("%Y%m%d")
    base_time = "0800"

    api_key = getattr(settings, "WEATHER_API_KEY", None)
    url = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
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
        items = requests.get(url, params=params).json()['response']['body']['items']['item']
    except Exception:
        return []

    result = {}
    for item in items:
        date = item['fcstDate']
        cat = item['category']
        val = item['fcstValue']
        if date not in result:
            result[date] = {"TMP": [], "POP": [], "PTY": [], "SKY": []}
        if cat in result[date]:
            try:
                result[date][cat].append(float(val))
            except ValueError:
                continue

    summary = []
    for date, values in result.items():
        temp = sum(values['TMP']) / len(values['TMP']) if values['TMP'] else 0
        rain = max(values['POP']) if values['POP'] else 0
        pty = int(max(values['PTY'], default=0))
        sky = int(max(values['SKY'], default=1))
        if pty == 0:
            weather_text = {1: "맑음", 3: "구름많음", 4: "흐림"}.get(sky, "맑음")
        else:
            weather_text = {1: "비", 2: "비/눈", 3: "눈", 4: "소나기"}.get(pty, "비")

        summary.append({
            "date": datetime.datetime.strptime(date, "%Y%m%d").date(),
            "temperature": temp,
            "precipitation": rain,
            "weather": weather_text
        })

    return summary

def get_mid_term(region_name):
    code = MID_TERM_REGION_CODE.get(region_name)
    if not code:
        return []

    today = datetime.datetime.now()
    tmFc = (today - datetime.timedelta(days=1)).strftime("%Y%m%d") + "0600"
    api_key = getattr(settings, "WEATHER_API_KEY", None)

    try:
        land_item = requests.get(
            "http://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst",
            params={"serviceKey": api_key, "dataType": "JSON", "regId": code["land"], "tmFc": tmFc}
        ).json()['response']['body']['items']['item'][0]

        temp_item = requests.get(
            "http://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa",
            params={"serviceKey": api_key, "dataType": "JSON", "regId": code["temp"], "tmFc": tmFc}
        ).json()['response']['body']['items']['item'][0]
    except Exception:
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
            "temperature": temp_avg,
            "precipitation": 0,
            "weather": weather
        })
    return result

def get_combined_weather(lat, lon, address):
    region_name = get_region_name_from_address(address)
    short_term = get_short_term(lat, lon)
    mid_term = get_mid_term(region_name)
    return [{**item, "region_name": region_name} for item in (short_term + mid_term)]