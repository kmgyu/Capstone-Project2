import math

# ✅ 격자 변환 (위경도 → 기상청 격자 좌표)
def convert_to_grid(lat, lon):
    RE = 6371.00877  # 지구 반경(km)
    GRID = 5.0       # 격자 간격(km)
    SLAT1 = 30.0
    SLAT2 = 60.0
    OLON = 126.0
    OLAT = 38.0
    XO = 43
    YO = 136

    DEGRAD = math.pi / 180.0
    re = RE / GRID
    slat1 = SLAT1 * DEGRAD
    slat2 = SLAT2 * DEGRAD
    olon = OLON * DEGRAD
    olat = OLAT * DEGRAD

    sn = math.tan(math.pi * 0.25 + slat2 * 0.5) / math.tan(math.pi * 0.25 + slat1 * 0.5)
    sn = math.log(math.cos(slat1) / math.cos(slat2)) / math.log(sn)
    sf = math.pow(math.tan(math.pi * 0.25 + slat1 * 0.5), sn) * math.cos(slat1) / sn
    ro = math.pow(math.tan(math.pi * 0.25 + olat * 0.5), sn)
    ro = re * sf / ro

    ra = math.pow(math.tan(math.pi * 0.25 + lat * DEGRAD * 0.5), sn)
    ra = re * sf / ra
    theta = lon * DEGRAD - olon

    if theta > math.pi: theta -= 2.0 * math.pi
    if theta < -math.pi: theta += 2.0 * math.pi
    theta *= sn

    x = int(ra * math.sin(theta) + XO + 0.5)
    y = int(ro - ra * math.cos(theta) + YO + 0.5)
    return x, y

# "도 시" → "도, 시"
def get_region_name_from_address(address: str) -> str:
    parts = address.split()
    if len(parts) >= 2:
        return f"{parts[0]}, {parts[1]}"
    return address

# ✅ geometry 타입에 따라 위경도 추출 (기본값: 서울시청)
def extract_lon_lat_from_geometry(geometry):
    try:
        if not geometry or "type" not in geometry:
            raise ValueError("Invalid geometry: missing type")

        geom_type = geometry["type"]

        if geom_type == "Polygon":
            lon, lat = geometry["coordinates"][0][0]
        elif geom_type == "MultiPolygon":
            lon, lat = geometry["coordinates"][0][0][0]
        elif geom_type == "Point":
            lon, lat = geometry["coordinates"]
        elif geom_type == "LineString":
            lon, lat = geometry["coordinates"][0]
        elif geom_type == "MultiLineString":
            lon, lat = geometry["coordinates"][0][0]
        elif geom_type == "GeometryCollection":
            geometries = geometry.get("geometries", [])
            if geometries:
                return extract_lon_lat_from_geometry(geometries[0])
            else:
                raise ValueError("Empty GeometryCollection")
        else:
            print(f"[경고] 알 수 없는 geometry type: {geom_type}. 기본 좌표(서울시청)로 대체합니다.")
            lon, lat = 126.9784, 37.5666  # 서울시청;;

    except Exception as e:
        print(f"[오류] geometry 파싱 실패: {str(e)}. 기본 좌표(서울시청)로 대체합니다.")
        lon, lat = 126.9784, 37.5666

    return lon, lat