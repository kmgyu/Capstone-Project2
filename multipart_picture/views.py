# multipart_picture/views.py

from django.http import JsonResponse
from .forms import FieldPicForm, CropPicForm, PestPicForm

def upload_field_pic(request):
    if request.method == 'POST':
        form = FieldPicForm(request.POST, request.FILES)
        if form.is_valid():
            instance = form.save()
            return JsonResponse({
                'status': 'success',
                'message': 'FieldPic uploaded successfully',
                'data': {
                    'id': instance.field_pic_id,
                    'pic_name': instance.pic_name,
                    'pic_path': instance.pic_path.url
                }
            })
        else:
            return JsonResponse({'status': 'error', 'errors': form.errors}, status=400)

def upload_crop_pic(request):
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

def upload_pest_pic(request):
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