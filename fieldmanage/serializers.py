from rest_framework import serializers
from .models import Field

class FieldSerializer(serializers.ModelSerializer):
    geometry = serializers.JSONField()
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = Field
        fields = '__all__'
