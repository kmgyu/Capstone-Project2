import re

def parse_drone_log(log_content):
    lines = log_content.splitlines()
    status = "IDLE"
    battery = 100.0  # 기본값 또는 다른 로직 필요
    latitude = 0.0
    longitude = 0.0

    for line in lines:
        if "Taking off" in line:
            status = "TAKEOFF"
        elif "Landing" in line:
            status = "LANDING"
        elif "Target altitude reached" in line:
            status = "HOVERING"
        elif "Failsafe" in line or "EKF variance" in line:
            status = "FAILSAFE"

        # 배터리 값 예시: 로그에 배터리 값 없으면 향후 추가해야 함
        # 위치는 따로 GPS 수신 기능이 로그에 있다면 parsing
    return {
        "status": status,
        "battery": battery,
        "latitude": latitude,
        "longitude": longitude
    }