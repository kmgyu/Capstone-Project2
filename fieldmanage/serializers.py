from rest_framework import serializers
from photoapp.models import FieldPic
from .models import Field
from django.conf import settings
import os

class FieldSerializer(serializers.ModelSerializer):
    geometry = serializers.JSONField()
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    image_url = serializers.SerializerMethodField()  

    
    class Meta:
        model = Field
        fields = '__all__'

    def get_image_url(self, obj):
        latest_pic = FieldPic.objects.filter(field=obj).order_by('-pic_time').first()
        if latest_pic:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri('/media/' + latest_pic.pic_path)
            return '/media/' + latest_pic.pic_path
        return None
