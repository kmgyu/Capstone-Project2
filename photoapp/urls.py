from django.urls import path
from .views import UploadFieldPicAPIView, FlaskResultUpdateAPIView,FieldSummaryAPIView

urlpatterns = [
    path('upload/', UploadFieldPicAPIView.as_view(), name='upload-field-pic'),
    path('flask/update/', FlaskResultUpdateAPIView.as_view(), name='flask-update-pic'),
    #대표자신 get url
    path('summary/', FieldSummaryAPIView.as_view(), name='field-summary'),  

]