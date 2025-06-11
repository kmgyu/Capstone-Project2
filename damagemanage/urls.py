# urls.py
from django.urls import path
from .views import DamageManageView

urlpatterns = [
    path('damagemanage/', DamageManageView.as_view(), name='damage-manage'),
]
