from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from fieldmanage.models import Field
from weather.weather_api.short_term import get_or_create_hourly_weather
from weather.utils import get_region_name_from_address
import datetime

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def short_term_view_get_realtime_weather(request):
    user = request.user
    field_id = request.data.get("field_id")

    # ✅ 필드 선택
    try:
        if field_id:
            field = Field.objects.get(id=field_id, owner=user)
        else:
            field = Field.objects.filter(owner=user).first()
        if not field:
            return Response({"error": "해당 유저의 노지가 없습니다."}, status=404)
    except Field.DoesNotExist:
        return Response({"error": "field_id가 잘못되었거나 권한이 없습니다."}, status=404)

    # ✅ 위경도 및 주소 추출
    try:
        lon, lat = field.geometry['coordinates'][0][0]
        region_name = get_region_name_from_address(field.field_address)
    except Exception:
        return Response({"error": "geometry 또는 주소 파싱 오류"}, status=400)

    # ✅ DB에서 오늘 날짜 존재 여부 확인 → 없으면 API 호출 후 저장
    try:
        weather_queryset = get_or_create_hourly_weather(region_name, lat, lon)
    except Exception as e:
        return Response({"error": f"초단기 예보 처리 중 오류: {str(e)}"}, status=500)

    if not weather_queryset:
        return Response({"error": "날씨 정보를 가져올 수 없습니다."}, status=500)

    now_hour = datetime.datetime.now().hour
    weather_now = weather_queryset.order_by("-hour").first()    
    if not weather_now:
        return Response({"error": "요청 시간에 해당하는 예보가 없습니다."}, status=404)

    return Response({
        "region": region_name,
        "date": weather_now.date,
        "hour": weather_now.hour,
        "temperature": weather_now.temperature,
        "weather": weather_now.weather
    })