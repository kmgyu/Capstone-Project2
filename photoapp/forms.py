from django import forms
from .models import FieldPic

class FieldPicForm(forms.ModelForm):
    class Meta:
        model = FieldPic
        fields = ['field_id', 'pic_name', 'pic_path']