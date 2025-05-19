from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from fieldmanage.models import Field
from weather.models import Weather
from weather.weather_api.short_mid_term import get_combined_weather
from weather.utils import get_region_name_from_address, extract_lon_lat_from_geometry
from datetime import date, timedelta

class DailyTenDaysWeatherAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        field_id = request.data.get("field_id")
         # ✅ 디버깅: 로그인된 사용자 ID 출력
        print(f"[DEBUG] 로그인된 사용자 ID: {user.id}")
        print(f"[DEBUG] 요청받은 field_id: {field_id}")
        region_name = request.data.get("region_name")
        lat, lon = None, None

        if not region_name and field_id:
            try:
                field = Field.objects.get(pk=field_id, owner=user)
            except Field.DoesNotExist:
                return Response({"error": "해당 field_id의 Field가 존재하지 않습니다."}, status=400)

            region_name = get_region_name_from_address(field.field_address)
            lon, lat = extract_lon_lat_from_geometry(field.geometry)

        today = date.today()
        target_dates = [today + timedelta(days=i) for i in range(8)]
        queryset = Weather.objects.filter(region_name=region_name, date__in=target_dates).order_by("date")

        if not queryset.exists():
            if lat is None or lon is None:
                return Response({"error": "해당 지역의 날씨 데이터가 없습니다.\n(lat/lon 값이 없어서 새로 호출할 수 없습니다)"}, status=400)

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
                queryset = Weather.objects.filter(region_name=region_name, date__in=target_dates).order_by("date")
            except Exception as e:
                return Response({"error": f"날씨 API 호출 실패: {str(e)}"}, status=500)

        if not queryset.exists():
            return Response({"error": f"{region_name} 지역의 날씨 데이터가 없습니다."}, status=404)

        result = [
            {
                "date": item.date,
                "weather": item.weather,
                "temperature_avg": item.temperature_avg,
                "precipitation": item.precipitation
            } for item in queryset
        ]

        return Response(result, status=200)