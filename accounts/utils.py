import jwt
from django.conf import settings
from rest_framework_simplejwt.tokens import AccessToken
from accounts.models import User, PasswordResetToken
from django.shortcuts import get_object_or_404
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

def get_user_from_access_token(access_token):
    try:
        payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=['HS256'])
        email = payload.get('email')
        jti = payload.get('jti')  # ✅ jti 꺼내기
        if not email or not jti:
            return None

        # ✅ jti로 OutstandingToken 찾기
        token_obj = OutstandingToken.objects.filter(jti=jti).first()
        if token_obj and BlacklistedToken.objects.filter(token=token_obj).exists():
            return None

        user = User.objects.get(email=email)
        return user

    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, User.DoesNotExist):
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
