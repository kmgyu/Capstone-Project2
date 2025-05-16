import os
import json
import requests
import base64
from datetime import datetime, timedelta
from random import choice

from django.conf import settings
from django.utils.timezone import make_aware

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser

from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.decorators import api_view, permission_classes

from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

from .forms import FieldPicForm
from .models import FieldPic
from fieldmanage.models import Field
from .tasks import enqueue_pic_path_task


# EXIF에서 GPS 및 촬영 시간 추출
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

# 저장 경로 생성하는 함수임
def get_dynamic_path(user_id, field_id):
    # ✅ MEDIA_ROOT를 기준으로 저장해야 repository 하위에 생성됨
    repo_root = settings.MEDIA_ROOT
    user_dir = os.path.join(repo_root, f'user_id_{user_id}')
    field_dir = os.path.join(user_dir, f'field_id_{field_id}')
    os.makedirs(field_dir, exist_ok=True)
    return field_dir

class UploadFieldPicAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        form = FieldPicForm(request.POST, request.FILES)
        if form.is_valid():
            instance = form.save(commit=False)

            field_id = request.POST.get('field_id')
            field = Field.objects.get(pk=field_id)
            instance.field = field

            image_file = request.FILES.get('pic_path')
            if image_file:
                img = Image.open(image_file)
                lat, lon, pic_time = extract_exif_data(img)
                instance.latitude = lat if lat else 0.0
                instance.longitude = lon if lon else 0.0
                instance.pic_time = make_aware(pic_time) if pic_time else datetime.now()

                save_dir = get_dynamic_path(field.owner.id,field.field_id)
                filename = image_file.name
                filepath = os.path.join(save_dir, filename)
                with open(filepath, 'wb+') as dest:
                        for chunk in image_file.chunks():
                            dest.write(chunk)

                relative_path = os.path.relpath(filepath, settings.MEDIA_ROOT)
                instance.pic_path.name = os.path.join(relative_path).replace('\\', '/')

                instance.save()

            enqueue_pic_path_task.delay(instance.pic_path.name)

            return Response({
                'status': 'success',
                'message': 'FieldPic uploaded successfully',
                'data': {
                    'id': instance.field_pic_id,
                    'pic_name': instance.pic_name,
                    'pic_path': instance.pic_path.name,
                    'longitude': instance.longitude,
                    'latitude': instance.latitude,
                    'pic_time': instance.pic_time.strftime('%Y-%m-%d %H:%M:%S'),
                    'user': request.user.username
                }
            })
        else:
            return Response({'status': 'error', 'errors': form.errors}, status=400)

class FlaskResultUpdateAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            data = json.loads(request.body)
            for item in data:
                pic_path = item.get("pic_path")
                pest = item.get("pest")
                bug = item.get("bug")

                FieldPic.objects.filter(pic_path=pic_path).update(
                    has_pest=pest,
                    has_bug=bug
                )
            return Response({"status": "updated"})
        except Exception as e:
            return Response({"error": str(e)}, status=400)

#get요청으로 사진 보내주기
class FieldSummaryAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({"error": "user_id is required"}, status=400)

        fields = Field.objects.filter(owner_id=user_id)
        today = datetime.today().date()
        yesterday = today - timedelta(days=1)

        result = []

        for field in fields:
            # 오늘/어제 사진 중 랜덤 1장 선택
            pics_today = FieldPic.objects.filter(field_id=field.pk, pic_time__date=today)
            pics_yesterday = FieldPic.objects.filter(field_id=field.pk, pic_time__date=yesterday)

            selected_pic = None
            if pics_today.exists():
                selected_pic = choice(pics_today)
            elif pics_yesterday.exists():
                selected_pic = choice(pics_yesterday)

            image_info = None

            if selected_pic:
                relative_media_path = selected_pic.pic_path.name.replace("repository/", "")
                image_url = request.build_absolute_uri(settings.MEDIA_URL + relative_media_path)
                image_info = {
                    "image_url": image_url,
                }

            result.append({
                "user_id": int(user_id),
                "field_id": field.pk,
                "field_name": field.name,
                "description": field.description,
                "image_url": image_info["image_url"] if image_info else None
            })

        return Response(result)