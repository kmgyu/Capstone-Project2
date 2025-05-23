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


def extract_exif_data(img):
    try:
        exif_data = img.getexif()
        gps_data = {}
        pic_time = None

        for tag, value in exif_data.items():
            tag_name = TAGS.get(tag)
            if tag_name == 'DateTimeOriginal':
                pic_time = datetime.strptime(value, '%Y:%m:%d %H:%M:%S')
            if tag_name == 'GPSInfo':
                for t in value:
                    sub_tag = GPSTAGS.get(t, t)
                    gps_data[sub_tag] = value[t]

        lat = gps_data.get('GPSLatitude')
        lon = gps_data.get('GPSLongitude')
        return lat, lon, pic_time
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

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        field_id = request.data.get('field_id')

        if not field_id:
            return Response({'error': 'field_id is required'}, status=400)

        try:
            field = Field.objects.get(pk=field_id)
        except Field.DoesNotExist:
            return Response({'error': 'Invalid field_id'}, status=400)

        serializer = FieldPicSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save(field=field)  
            
            image_file = request.FILES.get('pic_path')
            if image_file:
                img = Image.open(image_file)
                lat, lon, pic_time = extract_exif_data(img)
                instance.latitude = lat if lat else 0.0
                instance.longitude = lon if lon else 0.0
                instance.pic_time = make_aware(pic_time) if pic_time else datetime.now()

                save_dir = get_dynamic_path(field.owner.id, field.field_id)
                filename = image_file.name
                filepath = os.path.join(save_dir, filename)

                with open(filepath, 'wb+') as dest:
                    for chunk in image_file.chunks():
                        dest.write(chunk)

                relative_path = os.path.relpath(filepath, settings.MEDIA_ROOT)

                # 경로  구분자를 '/'로 통일
                normalized_path = relative_path.replace('\\', '/')

                # DB에 저장
                instance.pic_path = normalized_path
                instance.save()

                #redis연결되어야 사진 보내진다는 것
                #enqueue_pic_path_task.delay(instance.field_pic_id)

            return Response({
                'status': 'success',
                'message': 'FieldPic uploaded successfully',
                'data': {
                    'id': instance.field_pic_id,
                    'pic_name': instance.pic_name,
                    'pic_path': instance.pic_path,
                    'longitude': instance.longitude,
                    'latitude': instance.latitude,
                    'pic_time': instance.pic_time.strftime('%Y-%m-%d %H:%M:%S'),
                    'field_id': field_id,
                    'user_id': field.owner.id
                }
            })
        else:
            return Response({'status': 'error', 'errors': serializer.errors}, status=400)

class FlaskResultUpdateAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            data = json.loads(request.body)
            for item in data:
                photo_id = item.get("photo_id")
                pest = item.get("pest")
                disease = item.get("disease")

                FieldPic.objects.filter(field_pic_id=photo_id).update(
                    has_pest=pest,
                    has_disease=disease
                )
            return Response({"status": "updated"})
        except Exception as e:
            return Response({"error": str(e)}, status=400)
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
