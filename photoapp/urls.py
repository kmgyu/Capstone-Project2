from django.urls import path
from .views import UploadFieldPicAPIView,FieldSummaryAPIView

urlpatterns = [
    path('upload/', UploadFieldPicAPIView.as_view(), name='upload-field-pic'),
    #대표자신 get 
    path('summary/', FieldSummaryAPIView.as_view(), name='field-summary'),  

]