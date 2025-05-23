from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Sum
from django.db.models.functions import TruncDate
from .models import DroneLog, DroneErrorLog
from .serializers import DroneLogSerializer, DroneErrorLogSerializer, DroneSerializer
from fieldmanage.models import Field
from datetime import datetime, timedelta
from .models import Drone
# import numpy as np
# from shapely.geometry import Polygon, Point
# import json

class DroneRegisterView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):

        serializer = DroneSerializer(data=request.data)
        if serializer.is_valid():
            drone = serializer.save()
            return Response({
                "id": drone.drone_id,
                "serial_number": drone.serial_number
            }, status=201)
        return Response(serializer.errors, status=400)

class ClaimDroneAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serial_number = request.data.get('serial_number')

        if not serial_number:
            return Response({"detail": "serial_number는 필수입니다."}, status=400)

        try:
            drone = Drone.objects.get(serial_number=serial_number)
        except Drone.DoesNotExist:
            return Response({"detail": "해당 시리얼 넘버의 드론이 존재하지 않습니다."}, status=404)

        if drone.owner is not None:
            return Response({"detail": "이미 소유자가 지정된 드론입니다."}, status=400)

        # 현재 로그인된 사용자에게 소유권 할당
        drone.owner = request.user
        drone.save()

        return Response({
            "message": "드론 소유권이 성공적으로 등록되었습니다.",
            "drone_id": drone.drone_id,
            "serial_number": drone.serial_number,
            "owner_email": request.user.id
        }, status=200)
    
class MyDroneListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        drones = Drone.objects.filter(owner=request.user)
        serializer = DroneSerializer(drones, many=True)
        return Response(serializer.data)
    

class UpdateDroneAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, drone_id):
        try:
            drone = Drone.objects.get(id=drone_id, owner=request.user)
        except Drone.DoesNotExist:
            return Response({"detail": "수정할 권한이 없거나 드론이 존재하지 않습니다."}, status=404)

        name = request.data.get("name")
        if name:
            drone.name = name
            drone.save()
            return Response({"message": "드론 이름이 수정되었습니다."})
        return Response({"detail": "수정할 name이 필요합니다."}, status=400)
    
class DeleteDroneAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, drone_id):
        try:
            drone = Drone.objects.get(id=drone_id, owner=request.user)
        except Drone.DoesNotExist:
            return Response({"detail": "삭제할 권한이 없거나 드론이 존재하지 않습니다."}, status=404)

        drone.delete()
        return Response({"message": "드론이 성공적으로 삭제되었습니다."})

class UploadLogView(APIView):
    def post(self, request):
        data = request.data.copy()
        try:
            data["flight_time"] = datetime.fromisoformat(data["flight_time"])
        except (KeyError, ValueError):
            return Response({"error": "flight_time 필드 누락 또는 형식 오류 (ISO8601 형식 필요)"}, status=400)

        serializer = DroneLogSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "로그 저장 성공"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DroneLogBaseAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_drone_id(self, request):
        drone_id = request.GET.get('drone_id')
        if not drone_id:
            raise ValidationError("drone_id는 필수입니다.")
        return drone_id

    def get_queryset(self, drone_id):
        return DroneLog.objects.filter(drone_id=drone_id).order_by('-timestamp')


class GenericDroneLogView(DroneLogBaseAPIView):
    field_name = None

    def get(self, request):
        try:
            drone_id = self.get_drone_id(request)
            latest_log = self.get_queryset(drone_id).first()
            if latest_log:
                return Response({self.field_name: getattr(latest_log, self.field_name)}, status=status.HTTP_200_OK)
            else:
                return Response({"error": "로그 데이터가 없습니다."}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class BatteryLogView(GenericDroneLogView):
    field_name = "battery"


class AltitudeLogView(GenericDroneLogView):
    field_name = "altitude"


class GPSStrengthLogView(GenericDroneLogView):
    field_name = "gps_strength"

    def get(self, request):
        try:
            drone_id = self.get_drone_id(request)
            latest_log = self.get_queryset(drone_id).first()
            if not latest_log:
                return Response({"error": "로그 데이터가 없습니다."}, status=status.HTTP_404_NOT_FOUND)

            strength = getattr(latest_log, self.field_name)

            if strength == 1:
                level = "약함"
            elif strength == 2:
                level = "중간"
            elif strength == 3:
                level = "강함"
            elif 4 <= strength <= 6:
                level = "매우 강함"
            else:
                level = "알 수 없음"

            return Response({
                "gps_strength": strength,
                "strength_level": level
            }, status=status.HTTP_200_OK)

        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class FlightModeLogView(GenericDroneLogView):
    field_name = "flight_mode"


class LocationLogView(DroneLogBaseAPIView):
    def get(self, request):
        try:
            drone_id = self.get_drone_id(request)
            logs = self.get_queryset(drone_id)
            data = [{"longitude": log.longitude, "latitude": log.latitude} for log in logs]
            return Response(data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class DailyFlightTimeView(APIView):
    def get(self, request):
        drone_id = request.GET.get('drone_id')
        if not drone_id:
            return Response({"error": "drone_id는 필수입니다."}, status=400)

        logs = (
            DroneLog.objects.filter(drone_id=drone_id)
            .annotate(date=TruncDate('timestamp'))
            .values('date')
            .annotate(total_minutes=Sum('flight_time'))
            .order_by('date')
        )

        return Response([
            {"date": log["date"], "flight_time_min": log["total_minutes"]}
            for log in logs
        ])


class DroneErrorLogView(APIView):
    def get(self, request):
        drone_id = request.GET.get('drone_id')
        if not drone_id:
            return Response({"error": "drone_id는 필수입니다."}, status=400)

        logs = DroneErrorLog.objects.filter(drone_id=drone_id)
        serializer = DroneErrorLogSerializer(logs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = DroneErrorLogSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class FlightStatusView(APIView):
    def get(self, request):
        drone_id = request.GET.get('drone_id')
        if not drone_id:
            return Response({"error": "drone_id는 필수입니다."}, status=400)

        latest_log = DroneLog.objects.filter(drone_id=drone_id).order_by('-timestamp').first()
        if not latest_log:
            return Response({"status": "데이터 없음"}, status=404)

        now = timezone.now()
        delta = now - latest_log.timestamp
        is_flying = delta < timedelta(minutes=3)

        return Response({
            "status": "비행 중" if is_flying else "대기 중",
            "current_flight_time": latest_log.flight_time
        })
