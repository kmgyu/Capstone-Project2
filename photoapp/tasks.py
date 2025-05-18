from celery import shared_task
from django.conf import settings
from photoapp.models import FieldPic
import requests
import os
import json
from datetime import datetime, timedelta

pic_buffer = []
last_send_time = datetime.now()
#Flask 서버들(하드코딩으로 넣었음)->실제 운영 시 Nginx로 로드 밸런싱 가능
FLASK_SERVERS = [
    "http://172.26.21.246:5000/analyze",
    "http://172.26.21.247:5000/analyze",
    "http://172.26.21.248:5000/analyze"
]

@shared_task
def enqueue_pic_path_task(field_pic_id):
    global pic_buffer, last_send_time

    pic_buffer.append(int(photo_id))

    if len(pic_buffer) >= 10 or (datetime.now() - last_send_time > timedelta(minutes=1)):
        send_pics_to_flask_task.delay(pic_buffer)
        pic_buffer = []
        last_send_time = datetime.now()

@shared_task
def send_pics_to_flask_task(photo_ids):
    global flask_index
    try:
        files = []
        metadata = []

        for photo_id in photo_ids:
            pic = FieldPic.objects.get(field_pic_id=photo_id)
            full_path = os.path.join(settings.MEDIA_ROOT, pic.pic_path)
            file_name = os.path.basename(full_path)
            files.append(('images', (file_name, open(full_path, 'rb'), 'image/jpeg')))
            metadata.append({'photo_id': photo_id})

        # ✅ 서버 분산 전송: 라운드로빈 방식
        flask_url = FLASK_SERVERS[flask_index % len(FLASK_SERVERS)]
        flask_index += 1

        response = requests.post(
            flask_url,
            files=files,
            data={'metadata': json.dumps(metadata)}
        )

        if response.status_code == 200:
            results = response.json()
            update_fieldpic_from_flask_result.delay(results)

        return {"sent_count": len(files), "target": flask_url}
    except Exception as e:
        return {"error": str(e)}

@shared_task
def update_fieldpic_from_flask_result(results):
    updated = 0
    for item in results:
        pic_path = item.get('photo_id')
        pest = item.get('pest')
        bug = item.get('bug')

        updated += FieldPic.objects.filter(field_pic_id=photo_id).update(
            has_pest=pest,
            has_bug=bug
        )

    return {"status": "updated", "count": updated}

# ✅ 사진 업로드 후 Celery 큐에 추가하는 함수 (view용)
def enqueue_uploaded_photo(instance):
    photo_id=instance.field_id
    equeue_pic_path_task.delay(photo_id)
