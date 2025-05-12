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
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from .models import User, PasswordResetToken
from .serializers import *
from .utils import get_user_from_access_token, validate_reset_token

class AuthAPIView(APIView):
    # 토큰 확인용 API
    def get(self, request):
        access = request.headers.get('Authorization')

        if access and access.startswith('Bearer '):
            access = access.split(' ')[1]
        else:
            return Response({"detail": "Access token is missing."}, status=401)

        try:
            user = get_user_from_access_token(access)
            if user:
                return Response(UserSerializer(user).data, status=200)
            else:
                return Response({"detail": "유저 인증 실패"}, status=401)

        except jwt.ExpiredSignatureError:
            return Response({"detail": "Access token expired."}, status=401)

        except jwt.InvalidTokenError:
            return Response({"detail": "Invalid access token."}, status=401)

        except Exception as e:
            return Response({"detail": "토큰 검증 중 서버 오류가 발생했습니다."}, status=500)


    # 로그인용 API
    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        user = authenticate(email=email, password=password)
        
        if user:
            # ✅ 기존 발급된 모든 토큰 무효화
            try:
                # 기존 토큰 블랙리스트 처리
                tokens = OutstandingToken.objects.filter(user=user)
                for token in tokens:
                    if not BlacklistedToken.objects.filter(token=token).exists():
                        BlacklistedToken.objects.get_or_create(token=token)
            except Exception as e:
                # 블랙리스트 사용 안할 때 에러 방지
                pass

            # ✅ 새 토큰 발급
            token = CustomTokenObtainPairSerializer.get_token(user)
            access_token, refresh_token = str(token.access_token), str(token)

            res = Response({
                "user": UserSerializer(user).data,
                "message": "로그인 성공",
                "token": {
                    "access": access_token,
                    "refresh": refresh_token,
                },
            })
            # 밑의 코드 두줄은 왜 있는지 잘 모르겠음 우리 프론트는 로컬세션에 알아서 토큰 저장해서 쓰는데 set_cookie를 왜 쓰는것?
            # res.set_cookie("access", access_token, httponly=True, secure=True)
            # res.set_cookie("refresh", refresh_token, httponly=True, secure=True)
            return res

        return Response({"message": "이메일 또는 비밀번호가 틀렸습니다."}, status=400)

class RegisterAPIView(APIView):
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            user_data = {
                "email": user.email,
                "username": user.username,
            }

            res = Response({
                "user": user_data,
                "message": "회원가입 성공",
            }, status=201)

            return res

        return Response({
            "message": "요청 데이터가 유효하지 않습니다.",
            "errors": serializer.errors,
        }, status=400)


class ForgotPasswordView(APIView):
    # 비밀번호 재설정용 API
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return Response({"success": False, "message": "등록되지 않은 이메일입니다."}, status=404)

            # 1시간 이내 요청 횟수 제한
            recent_requests = PasswordResetToken.objects.filter(
                user=user, created_at__gte=timezone.now() - timezone.timedelta(hours=1)
            )
            if recent_requests.count() >= 3:
                return Response({"success": False, "message": "요청이 너무 많습니다. 1시간 후 다시 시도하세요."}, status=429)

            # ✅ 기존에 발급된 사용하지 않은 토큰 무효화
            PasswordResetToken.objects.filter(user=user, used=False).update(used=True)

            # ✅ 새로운 토큰 발급
            token_obj = PasswordResetToken.objects.create(user=user)

            # 이메일 발송
            reset_url = f"http://orion.mokpo.ac.kr:8483/reset-password/{token_obj.token}"
            html_msg = render_to_string("email/reset_password.html", {"user": user, "token": token_obj.token})

            send_mail(
                subject="비밀번호 재설정",
                message="비밀번호 재설정 링크를 확인해주세요.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                html_message=html_msg
            )

            return Response({"success": True, "message": "비밀번호 재설정 이메일이 발송되었습니다."})

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
