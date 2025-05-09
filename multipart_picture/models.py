from django.db import models

class FieldPic(models.Model):
    field_pic_id = models.AutoField(primary_key=True)
    field_id = models.IntegerField()
    pic_name = models.CharField(max_length=255)
    pic_path = models.ImageField(upload_to='field/')
    log_file = models.FileField(upload_to='logs/', null=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    pic_time = models.DateTimeField(auto_now_add=True)

# class CropPic(models.Model):
#     crop_pic_id = models.AutoField(primary_key=True)
#     field_pic = models.ForeignKey(FieldPic, on_delete=models.CASCADE)
#     pic_name = models.CharField(max_length=255)
#     pic_path = models.ImageField(upload_to='crop/')
#     pic_time = models.DateTimeField(auto_now_add=True)

# class PestPic(models.Model):
#     pest_pic_id = models.AutoField(primary_key=True)
#     crop_pic = models.ForeignKey(CropPic, on_delete=models.CASCADE)
#     pic_name = models.CharField(max_length=255)
#     pic_path = models.ImageField(upload_to='pest/')
#     pic_time = models.DateTimeField(auto_now_add=True)