
from .models import PasswordResetToken, User
from rest_framework import serializers
import re

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'

    def create(self, validated_data):
        user = User.objects.create_user(
            email = validated_data['email'],
            password = validated_data['password']
        )
        return user
 
class PasswordResetSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True)

    def validate_password(self, value):
        if len(value) < 8 or \
           not re.search(r'[A-Za-z]', value) or \
           not re.search(r'[0-9]', value) or \
           not re.search(r'[^A-Za-z0-9]', value):
            raise serializers.ValidationError("비밀번호는 8자 이상, 영문/숫자/특수문자를 포함해야 합니다.")
        return value

    def save(self, token):
        reset_token = PasswordResetToken.objects.get(token=token)
        user = reset_token.user
        password = self.validated_data['password']
        user.set_password(password)
        user.save()
        reset_token.mark_used()
        return user
    
class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("등록되지 않은 이메일입니다.")
        return value