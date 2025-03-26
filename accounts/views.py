from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .serializers import RegisterSerializer
from .models import UserProfile

class LoginView(APIView):
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        try:
            user = UserProfile.objects.get(username=username)
        except UserProfile.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if check_password(password, user.password):
            # ❗ JWT 발급은 동작하지 않을 수 있음 (user가 AbstractBaseUser 아님)
            return Response({'message': 'Login successful'})
        else:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()  # 토큰을 블랙리스트에 추가
            return Response({'message': 'Logged out successfully'}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'User registered successfully'}, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        # username = request.data.get('username')
        # password = request.data.get('password')
        # email = request.data.get('email', '')

        # if not username or not password:
        #     return Response({'error': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # try:
        #     UserProfile.objects.get(username=username)
        #     return Response({'error': 'Username already exists'}, status=400)
        # except Exception as e:
        #     print(e)
        #     pass  # 등록 진행
        
        # # if UserProfile.objects.filter(username=username).exists():
        # #     return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        # user = UserProfile.objects.create_user(username=username, password=password, email=email)
        # user.save()

        # refresh = RefreshToken.for_user(user)

        # return Response({
        #     'message': 'User registered successfully',
        #     'refresh': str(refresh),
        #     'access': str(refresh.access_token),
        # }, status=status.HTTP_201_CREATED)