from .models import PasswordResetToken, User
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
import re

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'username']
        extra_kwargs = {
            'password': {'write_only': True}, # 클라이언트에서 저장은 되지만 우리 DB에서 비밀번호는 꺼내올수 없게 하는 안전장치
            'username': {'required': True},
        }

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("이미 사용 중인 이메일입니다.")
        return value

    def validate_password(self, value):
        if len(value) < 8 or \
           not re.search(r'[A-Za-z]', value) or \
           not re.search(r'[0-9]', value) or \
           not re.search(r'[^A-Za-z0-9]', value):
            raise serializers.ValidationError("비밀번호는 8자 이상, 영문/숫자/특수문자를 포함해야 합니다.")
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            user_id=validated_data['user_id'],
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password']
        )


class PasswordResetSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True)

    def validate_password(self, value):
        if len(value) < 8 or \
           not re.search(r'[A-Za-z]', value) or \
           not re.search(r'[0-9]', value) or \
           not re.search(r'[^A-Za-z0-9]', value):
            raise serializers.ValidationError("비밀번호는 8자 이상, 영문/숫자/특수문자를 포함해야 합니다.")
        return value

    def save(self, user, token_obj):
        password = self.validated_data['password']
        user.set_password(password)
        user.save()
        token_obj.mark_used()
        return user

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("등록되지 않은 이메일입니다.")
        return value
    
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token['email'] = user.email
        return token
