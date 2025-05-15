# drone/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import Drone, Field
from .utils import parse_drone_log


class DroneLogUploadView(APIView):
    parser_classes = [MultiPartParser]
    permission_classes = [IsAuthenticated]

    # 드론 로그 업로드용 API
    def post(self, request):
        log_file = request.FILES.get('log_file')

        if not log_file:
            return Response({"status": "error", "message": "log_file is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            log_content = log_file.read().decode('utf-8')
        except UnicodeDecodeError:
            return Response({"status": "error", "message": "Failed to decode log file"}, status=status.HTTP_400_BAD_REQUEST)

        parsed_data = parse_drone_log(log_content)

        if not parsed_data:
            return Response({"status": "error", "message": "Failed to parse log file"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                drone = Drone.objects.create(
                    user=request.user,
                    battery=parsed_data.get("battery"),
                    status=parsed_data.get("status"),
                    latitude=parsed_data.get("latitude"),
                    longitude=parsed_data.get("longitude"),
                )
        except Exception as e:
            return Response({"status": "error", "message": "Failed to save drone data"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "status": "success",
            "drone_id": drone.drone_id,
            "message": "Log uploaded successfully",
        }, status=status.HTTP_201_CREATED)


class DroneStatusByFieldView(APIView):
    permission_classes = [IsAuthenticated]

    # 필드별 최신 드론 상태 조회용 API
    def get(self, request):
        field_id = request.GET.get('field_id')

        if not field_id:
            return Response({"status": "error", "message": "field_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            field = Field.objects.get(pk=field_id)
        except Field.DoesNotExist:
            return Response({"status": "error", "message": "Field not found"}, status=status.HTTP_404_NOT_FOUND)

        if field.owner != request.user:
            return Response({"status": "error", "message": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        drone = Drone.objects.filter(user=request.user, fields=field).order_by('-last_updated').first()

        if not drone:
            return Response({"status": "error", "message": "No drone linked to this field"}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "status": "success",
            "drone": {
                "battery": drone.battery,
                "status": drone.status,
                "latitude": drone.latitude,
                "longitude": drone.longitude,
            }
        }, status=status.HTTP_200_OK)
