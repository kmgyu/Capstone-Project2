from django.db import models

class FieldPic(models.Model):
    field_pic_id = models.AutoField(primary_key=True)
    field_id = models.IntegerField()
    pic_name = models.CharField(max_length=255)
    pic_path = models.ImageField(upload_to='field/')
    pic_time = models.DateTimeField(auto_now_add=True)

class CropPic(models.Model):
    crop_pic_id = models.AutoField(primary_key=True)
    field_pic = models.ForeignKey(FieldPic, on_delete=models.CASCADE)
    pic_name = models.CharField(max_length=255)
    pic_path = models.ImageField(upload_to='crop/')
    pic_time = models.DateTimeField(auto_now_add=True)

class PestPic(models.Model):
    pest_pic_id = models.AutoField(primary_key=True)
    crop_pic = models.ForeignKey(CropPic, on_delete=models.CASCADE)
    pic_name = models.CharField(max_length=255)
    pic_path = models.ImageField(upload_to='pest/')
    pic_time = models.DateTimeField(auto_now_add=True)

#업로드 사진 경로
#MEDIA_URL = '/media/'
#MEDIA_ROOT = '/home/Capstone-Project2/storage'


#config안의 urls.py에 추가할 파일
#from django.conf import settings
#from django.conf.urls.static import static

# urlpatterns = [
#     path("admin/", admin.site.urls),
#     path("auth/", include("accounts.urls")),
#     path("field/", include("fieldmanage.urls")),
#     path("todo/", include("todolist.urls")),
#     path("upload/", include("multipart_picture.urls")),  # 추가된 이미지 업로드 경로
# ] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)