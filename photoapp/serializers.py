from rest_framework import serializers
from .models import FieldPic

class FieldPicSerializer(serializers.ModelSerializer):
    field_id = serializers.IntegerField(write_only=True)
    class Meta:
        model = FieldPic
        
        fields = ['field_id','pic_name', 'pic_path']
        
    pic_path = serializers.ImageField(required=True)