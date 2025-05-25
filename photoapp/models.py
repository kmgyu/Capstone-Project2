from django.db import models
from fieldmanage.models import Field


class FieldPic(models.Model):
    field_pic_id = models.AutoField(primary_key=True)
    field = models.ForeignKey(Field, on_delete=models.CASCADE)    
    pic_name = models.CharField(max_length=255)
    pic_path = models.CharField(max_length=300, blank=True)
    
    #metadata로 받는 데이터(위도,경도,찍은시간)
    latitude = models.FloatField(null=True)
    longitude = models.FloatField(null=True)
    pic_time = models.DateTimeField(null=True)

    class Meta:
        db_table = "photoapp_fieldpic"