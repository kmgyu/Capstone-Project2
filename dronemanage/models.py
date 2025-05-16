# models.py (dronemanage)
from django.db import models
from django.utils import timezone

class DroneLog(models.Model):
    log_id = models.AutoField(primary_key=True)
    field_id = models.IntegerField(default=0)
    drone_id = models.IntegerField(default=0)
    battery = models.FloatField(default=0.0)
    latitude = models.FloatField(default=0.0)
    longitude = models.FloatField(default=0.0)
    altitude = models.FloatField(default=0.0)
    gps_strength = models.IntegerField(default=0)
    flight_mode = models.CharField(max_length=50, default='UNKNOWN')
    flight_time = models.DateTimeField(default=timezone.now)  # 드론이 생성한 실제 시간
    timestamp = models.DateTimeField(auto_now_add=True)  # 서버에 저장된 시각

    class Meta:
        db_table = 'drone_log'

    def __str__(self):
        return f"Log - Field {self.field_id}, Drone {self.drone_id} @ {self.timestamp}"