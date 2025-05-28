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
        
class PestResult(models.Model):
    field_pic = models.ForeignKey(FieldPic, on_delete=models.CASCADE, related_name='pest_results')
    pest_name = models.CharField(max_length=100)
    detected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pest_result"

class DiseaseResult(models.Model):
    field_pic = models.ForeignKey(FieldPic, on_delete=models.CASCADE, related_name='disease_results')
    disease_name = models.CharField(max_length=100)
    detected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "disease_result"
