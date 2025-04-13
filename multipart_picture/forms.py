from django import forms
from .models import FieldPic, CropPic, PestPic

class FieldPicForm(forms.ModelForm):
    class Meta:
        model = FieldPic
        fields = ['field_id', 'pic_name', 'pic_path']

class CropPicForm(forms.ModelForm):
    class Meta:
        model = CropPic
        fields = ['field_pic', 'pic_name', 'pic_path']

class PestPicForm(forms.ModelForm):
    class Meta:
        model = PestPic
        fields = ['crop_pic', 'pic_name', 'pic_path']