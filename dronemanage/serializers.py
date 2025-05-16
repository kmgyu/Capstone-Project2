from rest_framework import serializers
from .models import DroneLog

class DroneLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DroneLog
        fields = '__all__'
