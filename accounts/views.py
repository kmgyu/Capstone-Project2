import jwt
from rest_framework.views import APIView
from .serializers import *
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework import status
from rest_framework.response import Response
from django.contrib.auth import authenticate
from django.shortcuts import render, get_object_or_404
from django.conf import settings
from django.template.loader import render_to_string
from django.core.mail import send_mail
from django.utils import timezone
from config.settings import SECRET_KEY
from .models import User, PasswordResetToken
from .serializers import ForgotPasswordSerializer, PasswordResetSerializer


class AuthAPIView(APIView):
    # 유저 정보 확인
    def get(self, request):
        try:
            # access token을 decode 해서 유저 id 추출 => 유저 식별
            access = request.COOKIES['access']
            payload = jwt.decode(access, SECRET_KEY, algorithms=['HS256'])
            pk = payload.get('user_id')
            user = get_object_or_404(User, pk=pk)
            serializer = UserSerializer(instance=user)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except(jwt.exceptions.ExpiredSignatureError):
            # 토큰 만료 시 토큰 갱신
            data = {'refresh': request.COOKIES.get('refresh', None)}
            serializer = TokenRefreshSerializer(data=data)
            if serializer.is_valid(raise_exception=True):
                access = serializer.data.get('access', None)
                refresh = serializer.data.get('refresh', None)
                payload = jwt.decode(access, SECRET_KEY, algorithms=['HS256'])
                pk = payload.get('user_id')
                user = get_object_or_404(User, pk=pk)
                serializer = UserSerializer(instance=user)
                res = Response(serializer.data, status=status.HTTP_200_OK)
                res.set_cookie('access', access)
                res.set_cookie('refresh', refresh)
                return res
            raise jwt.exceptions.InvalidTokenError
        # 로그인
    def post(self, request):
    	# 유저 인증
        user = authenticate(
            email=request.data.get("email"), password=request.data.get("password")
        )
        # 이미 회원가입 된 유저일 때
        if user is not None:
            serializer = UserSerializer(user)
            # jwt 토큰 접근
            token = TokenObtainPairSerializer.get_token(user)
            refresh_token = str(token)
            access_token = str(token.access_token)
            res = Response(
                {
                    "user": serializer.data,
                    "message": "login success",
                    "token": {
                        "access": access_token,
                        "refresh": refresh_token,
                    },
                },
                status=status.HTTP_200_OK,
            )
            # jwt 토큰 => 쿠키에 저장
            res.set_cookie("access", access_token, httponly=True)
            res.set_cookie("refresh", refresh_token, httponly=True)
            return res
        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)

    # 로그아웃
    def delete(self, request):
        # 쿠키에 저장된 토큰 삭제 => 로그아웃 처리
        response = Response({
            "message": "Logout success"
            }, status=status.HTTP_202_ACCEPTED)
        response.delete_cookie("access")
        response.delete_cookie("refresh")
        return response

class RegisterAPIView(APIView):
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # jwt 토큰 접근
            token = TokenObtainPairSerializer.get_token(user)
            refresh_token = str(token)
            access_token = str(token.access_token)
            res = Response(
                {
                    "user": serializer.data,
                    "message": "register successs",
                    "token": {
                        "access": access_token,
                        "refresh": refresh_token,
                    },
                },
                status=status.HTTP_200_OK,
            )
            
            # jwt 토큰 => 쿠키에 저장
            res.set_cookie("access", access_token, httponly=True)
            res.set_cookie("refresh", refresh_token, httponly=True)
            
            return res
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class ForgotPasswordView(APIView):
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            user = User.objects.get(email=email)

            # 최근 1시간 이내 요청 횟수 제한
            recent_requests = PasswordResetToken.objects.filter(
                user=user, created_at__gte=timezone.now() - timezone.timedelta(hours=1)
            )
            if recent_requests.count() >= 3:
                return Response({"success": False, "message": "요청이 너무 많습니다. 1시간 후 다시 시도하세요."}, status=429)

            token_obj = PasswordResetToken.objects.create(user=user)
            reset_url = f"http://orion.mokpo.ac.kr:8483/reset-password/{token_obj.token}"
            html_message = render_to_string("email/reset_password.html", {
                "user": user,
                "token": token_obj.token,
            })

            send_mail(
                subject="비밀번호 재설정 안내",
                message="비밀번호 재설정 링크를 확인해주세요.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
            )

            return Response({"success": True, "message": "비밀번호 재설정 이메일이 발송되었습니다."})
        return Response({"success": False, "message": serializer.errors}, status=400)

class ResetPasswordVerifyView(APIView):
    def get(self, request, token):
        try:
            token_obj = PasswordResetToken.objects.get(token=token)
            if token_obj.used:
                return Response({"valid": False, "message": "이미 사용된 토큰입니다."})
            if token_obj.is_expired():
                return Response({"valid": False, "message": "토큰이 만료되었습니다."})
            return Response({"valid": True, "message": "유효한 토큰입니다."})
        except PasswordResetToken.DoesNotExist:
            return Response({"valid": False, "message": "존재하지 않는 토큰입니다."})

class ResetPasswordView(APIView):
    def post(self, request, token):
        try:
            token_obj = PasswordResetToken.objects.get(token=token)
            if token_obj.used or token_obj.is_expired():
                return Response({"success": False, "message": "유효하지 않거나 만료된 토큰입니다."})
        except PasswordResetToken.DoesNotExist:
            return Response({"success": False, "message": "존재하지 않는 토큰입니다."})

        serializer = PasswordResetSerializer(data=request.data)
        if serializer.is_valid():
            user = token_obj.user
            user.set_password(serializer.validated_data['password'])
            user.save()
            token_obj.mark_used()
            return Response({"success": True, "message": "비밀번호가 재설정되었습니다."})
        return Response({"success": False, "message": serializer.errors})