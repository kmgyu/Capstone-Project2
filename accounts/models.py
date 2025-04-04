from django.db import models
from django.utils.timezone import now
from django.contrib.auth.models import AbstractBaseUser, UserManager

class User(AbstractBaseUser):
    '''
    legacy custom model
    '''
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    created_at = models.DateTimeField(default=now)
    objects = UserManager()

    class Meta:
        db_table = "userinfo"

    def __str__(self):
        return self.username