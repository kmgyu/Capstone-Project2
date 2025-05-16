from celery import shared_task
from django.conf import settings
import requests
import os
from datetime import datetime, timedelta

pic_buffer = []
last_send_time = datetime.now()

@shared_task
def enqueue_pic_path_task(pic_path):
    global pic_buffer, last_send_time

    pic_buffer.append(pic_path)

    if len(pic_buffer) >= 10 or (datetime.now() - last_send_time > timedelta(minutes=1)):
        send_pics_to_flask_task.delay(pic_buffer)
        pic_buffer = []
        last_send_time = datetime.now()

@shared_task
def send_pics_to_flask_task(pic_paths):
    full_paths = [os.path.join(settings.BASE_DIR, path) for path in pic_paths]
    try:
        response = requests.post("http://172.26.21.246:5000/analyze", json={"file_paths": full_paths})
        return response.json()
    except Exception as e:
        return {"error": str(e)}