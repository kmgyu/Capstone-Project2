from django.urls import path
from . import views

urlpatterns = [
    path('upload/field/', views.upload_field, name='upload_field'),
    path('upload/crop/', views.upload_crop, name='upload_crop'),
    path('upload/pest/', views.upload_pest, name='upload_pest'),
]