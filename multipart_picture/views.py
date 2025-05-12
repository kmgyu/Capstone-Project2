from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .forms import FieldPicForm
from .models import FieldPic
#메타데이터에서 위도,경도 추출하게 해주는 라이브러리이다잇
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

# EXIF에서 GPS 정보 추출 함수
def extract_decimal_gps(img):
    try:
        exif_data = img.getexif()
        gps_data = {}
        for tag, value in exif_data.items():
            tag_name = TAGS.get(tag)
            if tag_name == 'GPSInfo':
                for t in value:
                    sub_tag = GPSTAGS.get(t, t)
                    gps_data[sub_tag] = value[t]

        lat = gps_data.get('GPSLatitude')
        lon = gps_data.get('GPSLongitude')
        if isinstance(lat, float) and isinstance(lon, float):  
            return lat, lon
        else:
            return None, None
    except Exception as e:
        print(f"EXIF error: {e}")
        return None, None

# 도분초(DMS) → 십진수(decimal degrees) 변환
#혹시나 십진수로 안주면 이거 주석 제거하면 됩니다
# def convert_to_degrees(value):
#     d = value[0][0] / value[0][1]
#     m = value[1][0] / value[1][1]
#     s = value[2][0] / value[2][1]
#     return d + (m / 60.0) + (s / 3600.0)

#@csrf_exempt  테스,트 환경에서만 쓸 것 jwt무시할 거임

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_field(request):
    form = FieldPicForm(request.POST, request.FILES)
    if form.is_valid():
        instance = form.save(commit=False)
        instance.user = request.user

        # 우선 POST에 latitude/longitude가 있으면 우선 사용
        lat = request.POST.get('latitude')
        lon = request.POST.get('longitude')

        if lat and lon:
            instance.latitude = float(lat)
            instance.longitude = float(lon)
        else:
            image_file = request.FILES.get('pic_path')
            if image_file:
                img = Image.open(image_file)
                lat, lon = extract_decimal_gps(img)
                instance.latitude = lat if lat is not None else 0.0
                instance.longitude = lon if lon is not None else 0.0

        instance.save()
        return JsonResponse({
            'status': 'success',
            'message': 'FieldPic uploaded successfully',
            'data': {
                'id': instance.field_pic_id,
                'pic_name': instance.pic_name,
                'pic_path': instance.pic_path.url,
                'longitude': instance.longitude,
                'latitude': instance.latitude,
                'pic_time': instance.pic_time.strftime('%Y-%m-%d %H:%M:%S'),
                'user': request.user.username
            }
        })
    else:
        return JsonResponse({'status': 'error', 'errors': form.errors}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_field_pics(request):
    user = request.user
    pics = FieldPic.objects.filter(user=user).order_by('-pic_time')
    data = []
    for pic in pics:
        data.append({
            'id': pic.field_pic_id,
            'field_id': pic.field_id,
            'pic_name': pic.pic_name,
            'pic_path': request.build_absolute_uri(pic.pic_path.url),
            'longitude': pic.longitude,
            'latitude': pic.latitude,
            'pic_time': pic.pic_time.strftime('%Y-%m-%d %H:%M:%S')
        })
    return JsonResponse({'status': 'success', 'count': len(data), 'photos': data})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_crop(request):
    form = CropPicForm(request.POST, request.FILES)
    if form.is_valid():
        instance = form.save(commit=False)

        lat = request.POST.get('latitude')
        lon = request.POST.get('longitude')
        if lat and lon:
            instance.latitude = float(lat)
            instance.longitude = float(lon)
        else:
            image_file = request.FILES.get('pic_path')
            if image_file:
                img = Image.open(image_file)
                lat, lon = extract_decimal_gps(img)
                instance.latitude = lat if lat is not None else 0.0
                instance.longitude = lon if lon is not None else 0.0

        instance.save()
        return JsonResponse({
            'status': 'success',
            'message': 'CropPic uploaded successfully',
            'data': {
                'id': instance.crop_pic_id,
                'pic_name': instance.pic_name,
                'pic_path': instance.pic_path.url,
                'latitude': instance.latitude,
                'longitude': instance.longitude
            }
        })
    else:
        return JsonResponse({'status': 'error', 'errors': form.errors}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_pest(request):
    form = PestPicForm(request.POST, request.FILES)
    if form.is_valid():
        instance = form.save(commit=False)

        lat = request.POST.get('latitude')
        lon = request.POST.get('longitude')
        if lat and lon:
            instance.latitude = float(lat)
            instance.longitude = float(lon)
        else:
            image_file = request.FILES.get('pic_path')
            if image_file:
                img = Image.open(image_file)
                lat, lon = extract_decimal_gps(img)
                instance.latitude = lat if lat is not None else 0.0
                instance.longitude = lon if lon is not None else 0.0

        instance.save()
        return JsonResponse({
            'status': 'success',
            'message': 'PestPic uploaded successfully',
            'data': {
                'id': instance.pest_pic_id,
                'pic_name': instance.pic_name,
                'pic_path': instance.pic_path.url,
                'latitude': instance.latitude,
                'longitude': instance.longitude
            }
        })
    else:
        return JsonResponse({'status': 'error', 'errors': form.errors}, status=400)
