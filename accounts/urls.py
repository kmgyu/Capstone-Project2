from django.urls import path
# from .views import LoginView, LogoutView, RegisterView
from .views import AuthAPIView, RegisterAPIView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # post - login, delete - logout, get - user info
    path('auth/', AuthAPIView.as_view(), name='auth'),
    path('register/', RegisterAPIView.as_view(), name='register'),
    path("refresh/", TokenRefreshView.as_view()), # jwt 토큰 재발급
]
