from django.db import models
from djongo import models as djongo_models

class Field(models.Model):
    field_name = models.CharField(max_length=100)
    field_address = models.CharField(max_length=255)
    field_area = models.FloatField()
    crop_name = models.CharField(max_length=100)
    farm_startdate = models.DateField()

    geometry = djongo_models.JSONField()  # GeoJSON 저장용

    def __str__(self):
        return self.field_name
