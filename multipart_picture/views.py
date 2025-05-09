# multipart_picture/views.py

from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from .forms import FieldPicForm
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS


# 메타데이터(GPS) 추출 함수
def extract_gps_from_image(image_file):
    try:
        img = Image.open(image_file)
        exif_data = img._getexif()
        gps_info = {}

        if not exif_data:
            return None, None

        for tag, value in exif_data.items():
            decoded = TAGS.get(tag, tag)
            if decoded == "GPSInfo":
                for t in value:
                    sub_decoded = GPSTAGS.get(t, t)
                    gps_info[sub_decoded] = value[t]

        def dms_to_dd(dms):
            d, m, s = map(float, dms)
            return d + (m / 60.0) + (s / 3600.0)
            
        lat = gps_info.get('GPSLatitude')
        lat_ref = gps_info.get('GPSLatitudeRef')
        lon = gps_info.get('GPSLongitude')
        lon_ref = gps_info.get('GPSLongitudeRef')

        if lat and lon:
            latitude = dms_to_dd(lat)
            longitude = dms_to_dd(lon)
            if lat_ref != 'N':
                latitude = -latitude
            if lon_ref != 'E':
                longitude = -longitude
            return latitude, longitude
        return None, None

    except Exception as e:
        print(f"EXIF 추출 오류: {e}")
        return None, None


@csrf_exempt
def upload_field(request):
    if request.method == 'POST':
        form = FieldPicForm(request.POST, request.FILES)
        if form.is_valid():
            instance = form.save(commit=False)

            image_file = request.FILES.get('pic_path')
            lat, lon = extract_gps_from_image(image_file)
            instance.latitude = lat
            instance.longitude = lon

            instance.save()

            return JsonResponse({
                'status': 'success',
                'message': 'FieldPic uploaded successfully',
                'data': {
                    'id': instance.field_pic_id,
                    'pic_name': instance.pic_name,
                    'pic_path': instance.pic_path.url,
                    'log_file': instance.log_file.url if instance.log_file else None,
                    'latitude': lat,
                    'longitude': lon
                }
            })
        else:
            return JsonResponse({'status': 'error', 'errors': form.errors}, status=400)

def upload_crop(request):
    if request.method == 'POST':
        form = CropPicForm(request.POST, request.FILES)
        if form.is_valid():
            instance = form.save()
            return JsonResponse({
                'status': 'success',
                'message': 'CropPic uploaded successfully',
                'data': {
                    'id': instance.crop_pic_id,
                    'pic_name': instance.pic_name,
                    'pic_path': instance.pic_path.url
                }
            })
        else:
            return JsonResponse({'status': 'error', 'errors': form.errors}, status=400)

def upload_pest(request):
    if request.method == 'POST':
        form = PestPicForm(request.POST, request.FILES)
        if form.is_valid():
            instance = form.save()
            return JsonResponse({
                'status': 'success',
                'message': 'PestPic uploaded successfully',
                'data': {
                    'id': instance.pest_pic_id,
                    'pic_name': instance.pic_name,
                    'pic_path': instance.pic_path.url
                }
            })
        else:
            return JsonResponse({'status': 'error', 'errors': form.errors}, status=400)