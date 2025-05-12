from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from django.http import JsonResponse
from .models import Drone
from .utils import parse_drone_log

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def upload_drone_log(request):
    user = request.user
    log_file = request.FILES.get("log_file")

    if not log_file:
        return JsonResponse({'status': 'error', 'message': 'log_file is required'}, status=400)

    log_content = log_file.read().decode('utf-8')
    parsed_data = parse_drone_log(log_content)

    drone = Drone.objects.create(
        user=user,
        battery=parsed_data["battery"],
        status=parsed_data["status"],
        latitude=parsed_data["latitude"],
        longitude=parsed_data["longitude"]
    )

    return JsonResponse({'status': 'success', 'drone_id': drone.drone_id, 'message': 'Log uploaded'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_drone_status_by_field(request):
    field_id = request.GET.get('field_id')
    if not field_id:
        return JsonResponse({'status': 'error', 'message': 'field_id is required'}, status=400)

    try:
        field = Field.objects.get(pk=field_id)
        if field.owner != request.user:
            return JsonResponse({'status': 'error', 'message': 'Unauthorized'}, status=403)

        # 이 필드와 연결된 사용자의 드론 중 최신 드론 상태
        drone = Drone.objects.filter(user=request.user, fields=field).order_by('-last_updated').first()
        if not drone:
            return JsonResponse({'status': 'error', 'message': 'No drone linked to this field'}, status=404)

        return JsonResponse({
            'status': 'success',
            'drone': {
                'battery': drone.battery,
                'status': drone.status,
                'latitude': drone.latitude,
                'longitude': drone.longitude
            }
        })

    except Field.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Field not found'}, status=404)