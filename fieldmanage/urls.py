from django.urls import path
from .views import FieldListView, FieldDetailView

# ~field/
urlpatterns = [
    path('list/', FieldListView.as_view(), name='list-field'),
    path('detail/', FieldDetailView.as_view(), name='detail-field'),
]
