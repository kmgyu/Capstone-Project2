import jwt
from django.conf import settings
from rest_framework_simplejwt.tokens import AccessToken
from accounts.models import User, PasswordResetToken
from django.shortcuts import get_object_or_404

def get_user_from_access_token(token):
    try:
        access_token = AccessToken(token)
        user_id = access_token.get('user_id')
        return get_object_or_404(User, pk=user_id)
    except Exception:
        return None

def validate_reset_token(token_str):
    try:
        token = PasswordResetToken.objects.get(token=token_str)
        if token.used:
            return False, "이미 사용된 토큰입니다.", None
        if token.is_expired():
            return False, "토큰이 만료되었습니다.", None
        return True, "유효한 토큰입니다.", token
    except PasswordResetToken.DoesNotExist:
        return False, "존재하지 않는 토큰입니다.", None
