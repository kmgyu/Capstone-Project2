from django.urls import path
# from .views import LoginView, LogoutView, RegisterView
from .views import AuthAPIView, RegisterAPIView

urlpatterns = [
    # post - login, delete - logout, get - user info
    path('auth/', AuthAPIView.as_view(), name='auth'),
    path('register/', RegisterAPIView.as_view(), name='register'),
]
