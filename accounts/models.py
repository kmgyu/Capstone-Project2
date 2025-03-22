from djongo import models
from django.db.models.functions import Now
# from bson import ObjectId

class UserProfile(models.Model):
    # _id = models.ObjectIdField(primary_key=True)
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "accounts"
    
    def __str__(self):
        return self.username
