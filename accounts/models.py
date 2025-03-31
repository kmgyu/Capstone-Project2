from django.db import models
from django.utils.timezone import now

class UserProfile(models.Model):
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    # 속성 미존재
    # created_at = models.DateTimeField(default=now)

    class Meta:
        db_table = "userinfo" # 기존 accounts 테이블 이름에서 userinfo로 수정함.

    def __str__(self):
        return self.username
