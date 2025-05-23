from django.db import models
from django.utils import timezone
from django.conf import settings
# import jsonfield
import hashlib

class Drone(models.Model):
    drone_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    serial_number = models.CharField(max_length=12, unique=True, editable=False)
    registered_at = models.DateTimeField(auto_now_add=True)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null = True,
        blank=True,
        related_name='drones'
    )

    class Meta:
        db_table = 'drone'

    def save(self, *args, **kwargs):
        if not self.serial_number:
            base = f"{self.name}{timezone.now().timestamp()}".encode()
            self.serial_number = hashlib.sha256(base).hexdigest()[:12].upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Drone {self.name}"


class DroneLog(models.Model):
    log_id = models.AutoField(primary_key=True)
    field_id = models.IntegerField(default=0)
    drone = models.ForeignKey(Drone, on_delete=models.CASCADE)
    battery = models.FloatField(default=0.0)
    latitude = models.FloatField(default=0.0)
    longitude = models.FloatField(default=0.0)
    altitude = models.FloatField(default=0.0)
    gps_strength = models.IntegerField(default=0)
    flight_mode = models.CharField(max_length=50, default='UNKNOWN')
    flight_time = models.DateTimeField(default=timezone.now)  # 드론이 생성한 실제 시간
    timestamp = models.DateTimeField(auto_now_add=True)  # 서버에 저장된 시간

    class Meta:
        db_table = 'drone_log'

    def __str__(self):
        return f"Log - Field {self.field_id}, Drone {self.drone_id} @ {self.timestamp}"


# class DroneWaypoint(models.Model):
#     waypoint_id = models.AutoField(primary_key=True)
#     field_id = models.IntegerField()
#     drone = models.ForeignKey(Drone, on_delete=models.CASCADE)
#     waypoints = jsonfield.JSONField()  # waypoint 좌표들을 저장
#     created_at = models.DateTimeField(auto_now_add=True)
#     status = models.CharField(max_length=20, default='PENDING')  # PENDING, IN_PROGRESS, COMPLETED, FAILED
#     altitude = models.FloatField(default=10.0)  # 기본 고도 (미터)
#     speed = models.FloatField(default=5.0)  # 기본 속도 (m/s)

#     class Meta:
#         db_table = 'drone_waypoint'

#     def __str__(self):
#         return f"Waypoint - Field {self.field_id}, Drone {self.drone_id} @ {self.created_at}"


class DroneErrorLog(models.Model):
    drone = models.ForeignKey(Drone, on_delete=models.CASCADE)
    drone_time = models.DateTimeField()  # 드론에서 찍힌 시간
    timestamp = models.DateTimeField(auto_now_add=True)  # 서버에 저장된 시간
    message = models.CharField(max_length=255)

    class Meta:
        ordering = ['-timestamp']
        db_table = 'drone_error_log'

    def __str__(self):
        return f"Error for Drone {self.drone_id} at {self.timestamp}"
