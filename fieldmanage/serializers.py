from rest_framework import serializers
from .models import Field

class FieldSerializer(serializers.ModelSerializer):
    geometry = serializers.JSONField()
    
    class Meta:
        model = Field
        fields = '__all__'
