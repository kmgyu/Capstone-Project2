from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import DroneLog
from .serializers import DroneLogSerializer

from datetime import datetime

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
    def get_queryset(self, drone_id):
        return DroneLog.objects.filter(drone_id=drone_id).order_by('-timestamp')

    def get_drone_id(self, request):
        drone_id = request.GET.get('drone_id')
        if not drone_id:
            return None, Response({"error": "drone_id는 필수입니다."}, status=400)
        return drone_id, None


class BatteryLogView(DroneLogBaseAPIView):
    def get(self, request):
        drone_id, error = self.get_drone_id(request)
        if error:
            return error
        logs = self.get_queryset(drone_id)
        data = [log.battery for log in logs]
        return Response(data, status=200)


class LocationLogView(DroneLogBaseAPIView):
    def get(self, request):
        drone_id, error = self.get_drone_id(request)
        if error:
            return error
        logs = self.get_queryset(drone_id)
        data = [{"latitude": log.latitude, "longitude": log.longitude} for log in logs]
        return Response(data, status=200)


class AltitudeLogView(DroneLogBaseAPIView):
    def get(self, request):
        drone_id, error = self.get_drone_id(request)
        if error:
            return error
        logs = self.get_queryset(drone_id)
        data = [log.altitude for log in logs]
        return Response(data, status=200)


class GPSStrengthLogView(DroneLogBaseAPIView):
    def get(self, request):
        drone_id, error = self.get_drone_id(request)
        if error:
            return error
        logs = self.get_queryset(drone_id)
        data = [log.gps_strength for log in logs]
        return Response(data, status=200)


class FlightModeLogView(DroneLogBaseAPIView):
    def get(self, request):
        drone_id, error = self.get_drone_id(request)
        if error:
            return error
        logs = self.get_queryset(drone_id)
        data = [log.flight_mode for log in logs]
        return Response(data, status=200)
