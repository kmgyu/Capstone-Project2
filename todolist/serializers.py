from rest_framework import serializers
from .models import FieldTodo, Field, TaskProgress

class TaskProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskProgress
        fields = ['date', 'status']
        
class FieldTodoSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)  # 자동으로 request.user
    field = serializers.PrimaryKeyRelatedField(queryset=Field.objects.all())  # 외래키이므로 지정 필요
    start_date = serializers.SerializerMethodField()
    progresses = TaskProgressSerializer(many=True, read_only=True)
    
    def get_start_date(self, obj):
        return obj.start_date.date()
    
    class Meta:
        model = FieldTodo
        fields = '__all__'
        depth = 1           # (선택) FK 정보 일부 포함

 
class TaskProgressUpdateSerializer(serializers.Serializer):
    date = serializers.DateField()
    status = serializers.ChoiceField(choices=[('done', '완료'), ('skip', '미수행')])