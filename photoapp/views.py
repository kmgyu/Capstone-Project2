import os
import json
import base64
from datetime import datetime, timedelta
from random import choice

from django.conf import settings
from django.utils.timezone import make_aware

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authentication import SessionAuthentication, BasicAuthentication

from rest_framework.parsers import MultiPartParser, FormParser

from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

from .serializers import FieldPicSerializer
from .models import FieldPic
from fieldmanage.models import Field
from .tasks import enqueue_pic_path_task
import piexif

def convert_to_degrees(value):

    d = float(value[0][0]) / float(value[0][1])
    m = float(value[1][0]) / float(value[1][1])
    s = float(value[2][0]) / float(value[2][1])
    
    return d + (m / 60.0) + (s / 3600.0)


def extract_exif_data(img_path):
    try:
        # img = Image.open(img_path)
        exif_dict = piexif.load(img_path)
        print(exif_dict)
        
        # exif_data = img.getexif()
        gps_data = {}
        pic_time = None
        for tag, value in exif_dict.items():
            tag_name = TAGS.get(tag, tag)
            
            if tag_name == 'DateTimeOriginal':
                try:
                    pic_time = datetime.strptime(value, '%Y:%m:%d %H:%M:%S')
                except Exception as e:
                    print(f"Time parse error: {e}")
            if tag_name == 'GPSInfo' and isinstance(value, dict) or hasattr(value, 'items'):
                for t in value:
                    sub_tag = GPSTAGS.get(t, t)
                    gps_data[sub_tag] = value[t]

        lat = gps_data.get('GPSLatitude')
        lat_ref = gps_data.get('GPSLatitudeRef')
        lon = gps_data.get('GPSLongitude')
        lon_ref = gps_data.get('GPSLongitudeRef')

        latitude = convert_to_degrees(lat) if lat else None
        longitude = convert_to_degrees(lon) if lon else None

        if latitude and lat_ref == 'S':
            latitude = -latitude
        if longitude and lon_ref == 'W':
            longitude = -longitude
        return latitude, longitude, pic_time


    except Exception as e:
        print(f"EXIF error: {e}")
        return None, None, None

def get_dynamic_path(user_id, field_id):
    repo_root = settings.MEDIA_ROOT
    user_dir = os.path.join(repo_root, f'user_id_{user_id}')
    field_dir = os.path.join(user_dir, f'field_id_{field_id}')
    os.makedirs(field_dir, exist_ok=True)
    return field_dir

class UploadFieldPicAPIView(APIView):
    authentication_classes = []  # ⬅️ 인증 완전히 비활성화

# >>>>>>> 44201ed514c481b9a8db64c3858b7093697d9d2f
# =======
#     authentication_classes = []  # ⬅️ 인증 완전히 비활성화

# >>>>>>> 44201ed514c481b9a8db64c3858b7093697d9d2f
#     permission_classes = [AllowAny]
#     parser_classes = [MultiPartParser, FormParser]

#     def post(self, request):
#         field_id = request.data.get('field_id')

#         if not field_id:
#             return Response({'error': 'field_id is required'}, status=400)

#         try:
#             field = Field.objects.get(pk=field_id)
#         except Field.DoesNotExist:
# <<<<<<< HEAD
# <<<<<<< HEAD
#             return Response({'error': 'Invalid field_id'}, status=404)

#         serializer = FieldPicSerializer(data=request.data)
        
#         if serializer.is_valid():
#             instance = serializer.save(field=field)

# =======
# =======
# >>>>>>> 44201ed514c481b9a8db64c3858b7093697d9d2f
#             return Response({'error': 'Invalid field_id'}, status=400)

#         serializer = FieldPicSerializer(data=request.data)
#         if serializer.is_valid():
#             instance = serializer.save(field=field)  
            
# <<<<<<< HEAD
# >>>>>>> 44201ed514c481b9a8db64c3858b7093697d9d2f
# =======
# >>>>>>> 44201ed514c481b9a8db64c3858b7093697d9d2f
#             image_file = request.FILES.get('pic_path')
            
#             if image_file:
#                 try:
#                     save_dir = get_dynamic_path(field.owner.id, field.field_id)
#                     filename = image_file.name
#                     filepath = os.path.join(save_dir, filename)
#                     with open(filepath, 'wb+') as dest:
#                         print(filepath)
#                         for chunk in image_file.chunks():
#                             dest.write(chunk)

#                     # relative_path = os.path.relpath(filepath, settings.MEDIA_ROOT)
                    
#                     # 경로  구분자를 '/'로 통일
#                     # normalized_path = relative_path.replace('\\', '/')

                    
#                     # ✅ 사진 이름 추출 및 저장
#                     instance.pic_name = image_file.name  # <-- 파일명 저장
                    
#                     # DB에 저장
#                     instance.pic_path = filepath
#                     # instance.save()
#                     # print(normalized_path)
                    
#                     img = Image.open(filepath)
                    
#                     lat, lon, pic_time = extract_exif_data(filepath)
#                     # print(img)
#                     instance.latitude = lat if lat else None
#                     instance.longitude = lon if lon else None
#                     instance.pic_time = make_aware(pic_time) if pic_time else None
#                     # 수정 후 다시저장
#                     instance.save()

# <<<<<<< HEAD
# =======
#                 # DB에 저장
#                 instance.pic_path = normalized_path
#                 instance.save()

# <<<<<<< HEAD
# >>>>>>> 44201ed514c481b9a8db64c3858b7093697d9d2f
# =======
# >>>>>>> 44201ed514c481b9a8db64c3858b7093697d9d2f
#                 #redis연결되어야 사진 보내진다는 것
#                 #enqueue_pic_path_task.delay(instance.field_pic_id)
#                 except Exception as e:
#                     return Response({'error': f'Image processing failed: {str(e)}'}, status=500)

#             return Response({
#                 'status': 'success',
#                 'message': 'FieldPic uploaded successfully',
#                 'data': {
#                     'id': instance.field_pic_id,
#                     # 'pic_name': image_file.name,
#                     'pic_name': instance.pic_name,
#                     'pic_path': instance.pic_path,
#                     'longitude': instance.longitude,
#                     'latitude': instance.latitude,
#                     'pic_time': instance.pic_time.strftime('%Y-%m-%d %H:%M:%S') if instance.pic_time else None,
#                     'field_id': field.field_id,
#                     'user_id': field.owner.id

# =======
#                     'pic_time': instance.pic_time.strftime('%Y-%m-%d %H:%M:%S'),
#                     'field_id': field_id,
#                     'user_id': field.owner.id
# <<<<<<< HEAD
# >>>>>>> 44201ed514c481b9a8db64c3858b7093697d9d2f
# =======
# >>>>>>> 44201ed514c481b9a8db64c3858b7093697d9d2f
#                 }
#             })
#         else:
#             return Response({'status': 'error', 'errors': serializer.errors}, status=400)
# <<<<<<< HEAD
# <<<<<<< HEAD

# =======
# >>>>>>> 44201ed514c481b9a8db64c3858b7093697d9d2f
# =======
# >>>>>>> 44201ed514c481b9a8db64c3858b7093697d9d2f



class FieldSummaryAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({"error": "user_id is required"}, status=400)

        fields = Field.objects.filter(owner_id=user_id)
        result = []

        for field in fields:
            pics = FieldPic.objects.filter(field_id=field.pk)
            selected_pic = choice(pics) if pics.exists() else None

            image_info = None
            if selected_pic:
                relative_media_path = selected_pic.pic_path.replace("repository/", "")
                image_url = request.build_absolute_uri(settings.MEDIA_URL + relative_media_path)
                image_info = {
                    "image_url": image_url,
                }

            result.append({
                "user_id": int(user_id),
                "field_id": field.pk,
                "field_name": field.field_name,
                "description": field.description,
                "image_url": image_info["image_url"] if image_info else None
            })

        return Response(result)

# class FieldSummaryAPIView(APIView):
#     permission_classes = [AllowAny]

#     def get(self, request):
#         user_id = request.query_params.get('user_id')
#         if not user_id:
#             return Response({"error": "user_id is required"}, status=400)

#         fields = Field.objects.filter(owner_id=user_id)
#         today = datetime.today().date()
#         yesterday = today - timedelta(days=1)

#         result = []

#         for field in fields:
#             pics_today = FieldPic.objects.filter(field_id=field.pk, pic_time__date=today)
#             pics_yesterday = FieldPic.objects.filter(field_id=field.pk, pic_time__date=yesterday)

#             selected_pic = None
#             if pics_today.exists():
#                 selected_pic = choice(pics_today)
#             elif pics_yesterday.exists():
#                 selected_pic = choice(pics_yesterday)

#             image_info = None
#             if selected_pic:
#                 relative_media_path = selected_pic.pic_path.replace("repository/", "")
#                 image_url = request.build_absolute_uri(settings.MEDIA_URL + relative_media_path)
#                 image_info = {
#                     "image_url": image_url,
#                 }

#             result.append({
#                 "user_id": int(user_id),
#                 "field_id": field.pk,
#                 "field_name": field.field_name,
#                 "description": field.description,
#                 "image_url": image_info["image_url"] if image_info else None
#             })

#         return Response(result)
