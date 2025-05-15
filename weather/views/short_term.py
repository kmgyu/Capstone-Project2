from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from fieldmanage.models import Field
from weather.weather_api.short_term import get_ultra_short_forecast
from weather.utils import get_region_name_from_address
from datetime import date

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def short_term_view_get_realtime_weather(request):
    user = request.user
    field = Field.objects.filter(owner=user).first()
    if not field:
        return Response({"error": "등록된 노지가 없습니다."}, status=404)

    try:
        lon, lat = field.geometry['coordinates'][0][0]
    except Exception:
        return Response({"error": "geometry 필드 오류"}, status=400)

    data = get_ultra_short_forecast(lat, lon)
    if not data:
        return Response({"error": "실시간 날씨 데이터를 불러올 수 없습니다."}, status=500)

    return Response({
        "region": get_region_name_from_address(field.field_address),
        "date": data['date'],
        "hour": data['hour'],
        "weather": data['weather'],
        "temperature": data['temperature']
    })