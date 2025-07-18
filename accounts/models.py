# models.py
import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
from datetime import timedelta

# 헬퍼 클래스
class UserManager(BaseUserManager):
    def create_user(self, email, password, username=None, **kwargs):
        if not email:
            raise ValueError('Users must have an email address')
        if not username:
            raise ValueError('Users must have a username')

        user = self.model(
            email=email,
            username=username,
            **kwargs,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user


    def create_superuser(self, email=None, password=None, username=None, **extra_fields):
        """
        주어진 이메일, 비밀번호 등 개인정보로 User 인스턴스 생성
        단, 최상위 사용자이므로 권한을 부여
        """
        superuser = self.create_user(
            email=email,
            password=password,
            username=username,
            **extra_fields,
        )
        superuser.is_staff = True
        superuser.is_superuser = True
        superuser.is_active = True
        superuser.save(using=self._db)
        return superuser
# AbstractBaseUser를 상속해서 유저 커스텀
class User(AbstractBaseUser, PermissionsMixin):

    email = models.EmailField(max_length=30, unique=True, null=False, blank=False)
    is_superuser = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    username = models.CharField(max_length=100, null=False, blank=False)

    # 헬퍼 클래스 사용
    objects = UserManager()

    # 사용자의 username field는 email으로 설정 (이메일로 로그인)
    USERNAME_FIELD = 'email'
    
class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    def is_expired(self):
        return self.created_at < timezone.now() - timedelta(hours=24)

    def mark_used(self):
        self.used = True
        self.save()

    def __str__(self):
        return f"Token for {self.user.email} - Used: {self.used}"