from rest_framework import serializers
from .models import FieldPic

class FieldPicSerializer(serializers.ModelSerializer):
    field_id = serializers.IntegerField(write_only=True)
    pic_path = serializers.CharField(read_only=True)  # ✅ 입력으로 받지 않고, 응답에만 포함 <- ???

    class Meta:
        model = FieldPic
        # @Kimsummerrain은 보아라
        # 시리얼라이저에 왜 속성에도 없는걸 메타에 넣으시나요? 맞을래여? 이미지 파일 속성명은 왜 또 이따위인가여
        fields = ['field_id', 'pic_path']
