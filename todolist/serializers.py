from rest_framework import serializers
from .models import FieldTodo

class FieldTodoSerializer(serializers.ModelSerializer):
    class Meta:
        model = FieldTodo
        fields = '__all__'
