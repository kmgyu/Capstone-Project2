# accounts/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.utils import timezone
from django.template.loader import render_to_string
from django.conf import settings
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from .models import User, PasswordResetToken
from .serializers import *
from .utils import get_user_from_access_token, validate_reset_token

class AuthAPIView(APIView):
    def get(self, request):
        access = request.COOKIES.get('access')
        refresh = request.COOKIES.get('refresh')

        if not access:
            return Response({"detail": "Access token is missing."}, status=401)

        user = get_user_from_access_token(access)
        if user:
            return Response(UserSerializer(user).data)

        # 토큰 만료 or 오류 → refresh 시도
        if refresh:
            try:
                serializer = TokenRefreshSerializer(data={"refresh": refresh})
                serializer.is_valid(raise_exception=True)
                access_token = serializer.validated_data.get('access')
                user = get_user_from_access_token(access_token)
                if not user:
                    return Response({"detail": "유저 인증 실패"}, status=401)
                res = Response(UserSerializer(user).data)
                res.set_cookie("access", access_token, httponly=True, secure=True)
                return res
            except Exception:
                return Response({"detail": "리프레시 토큰이 유효하지 않습니다."}, status=401)

        return Response({"detail": "토큰이 유효하지 않습니다."}, status=401)

    def post(self, request):
        user = authenticate(email=request.data.get("email"), password=request.data.get("password"))
        if user:
            token = TokenObtainPairSerializer.get_token(user)
            access_token, refresh_token = str(token.access_token), str(token)

            res = Response({
                "user": UserSerializer(user).data,
                "message": "로그인 성공",
                "token": {"access": access_token, "refresh": refresh_token},
            })
            res.set_cookie("access", access_token, httponly=True, secure=True)
            res.set_cookie("refresh", refresh_token, httponly=True, secure=True)
            return res

        return Response({"message": "이메일 또는 비밀번호가 틀렸습니다."}, status=400)

    def delete(self, request):
        res = Response({"message": "로그아웃 완료"}, status=202)
        res.delete_cookie("access")
        res.delete_cookie("refresh")
        return res

class RegisterAPIView(APIView):
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token = TokenObtainPairSerializer.get_token(user)
            access_token, refresh_token = str(token.access_token), str(token)

            res = Response({
                "user": serializer.data,
                "message": "회원가입 성공",
                "token": {"access": access_token, "refresh": refresh_token},
            }, status=201)
            res.set_cookie("access", access_token, httponly=True, secure=True)
            res.set_cookie("refresh", refresh_token, httponly=True, secure=True)
            return res

        return Response(serializer.errors, status=400)

class ForgotPasswordView(APIView):
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return Response({"success": False, "message": "등록되지 않은 이메일입니다."}, status=404)

            recent_requests = PasswordResetToken.objects.filter(
                user=user, created_at__gte=timezone.now() - timezone.timedelta(hours=1)
            )
            if recent_requests.count() >= 3:
                return Response({"success": False, "message": "요청이 너무 많습니다. 1시간 후 다시 시도하세요."}, status=429)

            token_obj = PasswordResetToken.objects.create(user=user)
            reset_url = f"http://orion.mokpo.ac.kr:8483/reset-password/{token_obj.token}"
            html_msg = render_to_string("email/reset_password.html", {"user": user, "token": token_obj.token})

            send_mail(
                subject="비밀번호 재설정",
                message="비밀번호 재설정 링크를 확인해주세요.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                html_message=html_msg
            )
            return Response({"success": True, "message": "이메일이 발송되었습니다."})
        return Response({"success": False, "message": serializer.errors}, status=400)

class ResetPasswordVerifyView(APIView):
    def get(self, request, token):
        is_valid, message, _ = validate_reset_token(token)
        return Response({"valid": is_valid, "message": message})

class ResetPasswordView(APIView):
    def post(self, request, token):
        is_valid, message, token_obj = validate_reset_token(token)
        if not is_valid:
            return Response({"success": False, "message": message})

        serializer = PasswordResetSerializer(data=request.data)
        if serializer.is_valid():
            user = token_obj.user
            user.set_password(serializer.validated_data['password'])
            user.save()
            token_obj.mark_used()
            return Response({"success": True, "message": "비밀번호가 재설정되었습니다."})
        return Response({"success": False, "message": serializer.errors}, status=400)
