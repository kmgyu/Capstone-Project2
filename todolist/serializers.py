from rest_framework import serializers
from .models import FieldTodo, Field

class FieldTodoSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)  # 자동으로 request.user
    field = serializers.PrimaryKeyRelatedField(queryset=Field.objects.all())  # 외래키이므로 지정 필요

    class Meta:
        model = FieldTodo
        fields = '__all__'
