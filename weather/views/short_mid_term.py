from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from weather.models import Weather
from datetime import date, timedelta

@api_view(['POST'])
@permission_classes([AllowAny])
def short_mid_term_view_get_todo_weather(request):
    region_name = request.data.get("region_name")
    if not region_name:
        return Response({"error": "region_name이 필요합니다."}, status=400)

    today = date.today()
    target_dates = [today + timedelta(days=i) for i in range(10)]
    queryset = Weather.objects.filter(region_name=region_name, date__in=target_dates).order_by('date')

    if not queryset.exists():
        return Response({"error": "해당 지역의 날씨 데이터가 없습니다."}, status=404)

    result = [
        {
            "date": item.date,
            "weather": item.weather,
            "temperature_avg": item.temperature_avg,
            "precipitation": item.precipitation
        } for item in queryset
    ]

    return Response(result)
