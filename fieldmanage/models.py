from django.db import models
from django.utils.timezone import now
import jsonfield  # 따로 설치 필요

class Field(models.Model):
    field_name = models.CharField(max_length=100)
    field_address = models.CharField(max_length=255)
    field_area = models.FloatField()
    crop_name = models.CharField(max_length=100)
    farm_startdate = models.DateField(default=now)

    geometry = jsonfield.JSONField()  # GeoJSON 저장용

    def __str__(self):
        return self.field_name
