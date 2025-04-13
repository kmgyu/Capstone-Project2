from django.urls import path
# from .views import LoginView, LogoutView, RegisterView
from .views import AuthAPIView, RegisterAPIView
from rest_framework_simplejwt.views import TokenRefreshView
from .views import ForgotPasswordView, ResetPasswordVerifyView, ResetPasswordView

urlpatterns = [
    # post - login, delete - logout, get - user info
    path('auth/', AuthAPIView.as_view(), name='auth'),
    path('register/', RegisterAPIView.as_view(), name='register'),
    path("refresh/", TokenRefreshView.as_view()), # jwt 토큰 재발급
    path("forgot-password", ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/<uuid:token>/verify", ResetPasswordVerifyView.as_view(), name="reset-password-verify"),
    path("reset-password/<uuid:token>", ResetPasswordView.as_view(), name="reset-password"),
]
