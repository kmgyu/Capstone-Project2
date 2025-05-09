from django.urls import path
from . import views

urlpatterns = [
    path('field/', views.upload_field, name='upload_field'),
#     path('crop/', views.upload_crop, name='upload_crop'),
#     path('pest/', views.upload_pest, name='upload_pest'),
 ]