from rest_framework import serializers
from .models import FieldPic

class FieldPicSerializer(serializers.ModelSerializer):
    field_id = serializers.IntegerField(write_only=True)
<<<<<<< HEAD
<<<<<<< HEAD
    pic_path = serializers.CharField(read_only=True)  # ✅ 입력으로 받지 않고, 응답에만 포함

    class Meta:
        model = FieldPic
        fields = ['field_id','pic_name', 'pic_path']
=======
    class Meta:
        model = FieldPic
        
        fields = ['field_id','pic_name', 'pic_path']
        
    pic_path = serializers.ImageField(required=True)
>>>>>>> 44201ed514c481b9a8db64c3858b7093697d9d2f
=======
    class Meta:
        model = FieldPic
        
        fields = ['field_id','pic_name', 'pic_path']
        
    pic_path = serializers.ImageField(required=True)
>>>>>>> 44201ed514c481b9a8db64c3858b7093697d9d2f
