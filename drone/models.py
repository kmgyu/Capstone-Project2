from django.db import models
from django.contrib.auth import get_user_model
from fieldmanage.models import Field  # 필드 모델 import

class Drone(models.Model):
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    battery = models.FloatField()
    status = models.CharField(max_length=50)
    latitude = models.FloatField()
    longitude = models.FloatField()
    fields = models.ManyToManyField(Field, related_name='linked_drones')  # 💡 다대다 관계 추가
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "drone_status"

    def __str__(self):
        return f"Drone #{self.drone_id} - {self.status}"

    