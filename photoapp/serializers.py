from rest_framework import serializers
from .models import FieldPic

class FieldPicSerializer(serializers.ModelSerializer):
    class Meta:
        model = FieldPic
        fields = ['pic_name', 'pic_path']