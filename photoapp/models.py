from django.db import models
from fieldmanage.models import Field


class FieldPic(models.Model):
    field_pic_id = models.AutoField(primary_key=True)
    field_id = models.ForeignKey(Field, on_delete=models.CASCADE)  # field_id 연결
    pic_name = models.CharField(max_length=255)
    pic_path = models.ImageField(blank=True)
    #metadata로 받는 데이터(위도,경도,찍은시간)
    latitude = models.FloatField(null=True)
    longitude = models.FloatField(null=True)
    pic_time = models.DateTimeField(null=True)

    # Flask에서 분석 결과 반영할 필드
    has_pest = models.BooleanField(null=True)
    has_bug = models.BooleanField(null=True)

    class Meta:
        db_table = "photoapp_fieldpic"