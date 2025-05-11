from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Weather
from fieldmanage.models import Field
from .utils import get_region_name_from_address
from datetime import date

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_weather_response_for_user(request):
    user = request.user
    field = Field.objects.filter(owner=user).first()
    if not field:
        return Response({"error": "등록된 노지가 없습니다."}, status=404)

    try:
        # Polygon 형태의 geometry에서 첫 번째 좌표 추출
        lon, lat = field.geometry['coordinates'][0][0]
    except Exception:
        return Response({"error": "geometry 필드에서 좌표를 추출할 수 없습니다."}, status=400)

    region = get_region_name_from_address(field.field_address)
    today = date.today()
    weather = Weather.objects.filter(region_name=region, date=today).first()
    if not weather:
        return Response({"error": f"{region} 지역의 오늘 날씨 정보가 없습니다."}, status=404)

    return Response({
        "region": region,
        "date": str(weather.date),
        "weather": weather.weather,
        "temperature": weather.temperature,
        "precipitation": weather.precipitation,
    })

