from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from fieldmanage.models import Field
from weather.weather_api.short_term import get_or_create_hourly_weather
from weather.weather_api.short_mid_term import get_combined_weather
from weather.models import Weather
from weather.utils import get_region_name_from_address, extract_lon_lat_from_geometry
import datetime
from datetime import date, timedelta

class RealtimeShortTermWeatherAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        field_id = request.data.get("field_id")

        # ✅ 필드 조회
        try:
            if field_id:
                field = Field.objects.get(field_id=field_id, owner=user)
            else:
                field = Field.objects.filter(owner=user).first()
            if not field:
                return Response({"error": "해당 유저의 노지가 없습니다."}, status=404)
        except Field.DoesNotExist:
            return Response({"error": "field_id가 잘못되었거나 권한이 없습니다."}, status=404)

        # ✅ 위경도 및 주소 추출
        try:
            lon, lat = extract_lon_lat_from_geometry(field.geometry)
            region_name = get_region_name_from_address(field.field_address)
        except Exception:
            return Response({"error": "geometry 또는 주소 파싱 오류"}, status=400)

        # ✅ 초단기 예보 가져오기
        try:
            weather_queryset = get_or_create_hourly_weather(region_name, lat, lon)
        except Exception as e:
            return Response({"error": f"초단기 예보 처리 중 오류: {str(e)}"}, status=500)

        if not weather_queryset or not weather_queryset.exists():
            return Response({"error": "날씨 정보를 가져올 수 없습니다."}, status=500)
        now_hour = now.hour
        
        now_hour = datetime.datetime.now().hour
        weather_now = weather_queryset.filter(hour=now_hour).first() or weather_queryset.order_by("-hour").first()

        if not weather_now:
            return Response({"error": "요청 시간에 해당하는 예보가 없습니다."}, status=404)

        # ✅ 단기+중기 예보가 없다면 → 자동 저장
        today = date.today()
        target_dates = [today + timedelta(days=i) for i in range(8)]
        existing_forecast = Weather.objects.filter(region_name=region_name, date__in=target_dates)

        if not existing_forecast.exists():
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
                print(f"✅ 단기+중기 예보 저장 완료: {region_name}")
            except Exception as e:
                print(f"[오류] 단기+중기 예보 저장 실패: {str(e)}")

        # ✅ 응답 반환
        return Response({
            "region": region_name,
            "date": weather_now.date,
            "hour": weather_now.hour,
            "temperature": weather_now.temperature,
            "weather": weather_now.weather
        })