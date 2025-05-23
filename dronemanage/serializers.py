from rest_framework import serializers
from .models import DroneLog, DroneErrorLog, Drone

class DroneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Drone
        fields = ['drone_id', 'name', 'serial_number', 'registered_at', 'owner_id']


class DroneLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DroneLog
        fields = '__all__'


# class DroneWaypointSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = DroneWaypoint
#         fields = '__all__'


class DroneErrorLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DroneErrorLog
        fields = '__all__'