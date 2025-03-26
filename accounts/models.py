from django.db import models
from django.utils.timezone import now

class UserProfile(models.Model):
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    created_at = models.DateTimeField(default=now)

    class Meta:
        db_table = "accounts"

    def __str__(self):
        return self.username
