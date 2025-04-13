from django.shortcuts import render, redirect
from .forms import FieldPicForm, CropPicForm, PestPicForm
from .models import FieldPic, CropPic, PestPic

def upload_field(request):
    if request.method == 'POST':
        form = FieldPicForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return redirect('upload_field')
    else:
        form = FieldPicForm()
    return render(request, 'fieldmanage/upload_field.html', {'form': form})

def upload_crop(request):
    if request.method == 'POST':
        form = CropPicForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return redirect('upload_crop')
    else:
        form = CropPicForm()
    return render(request, 'fieldmanage/upload_crop.html', {'form': form})

def upload_pest(request):
    if request.method == 'POST':
        form = PestPicForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return redirect('upload_pest')
    else:
        form = PestPicForm()
    return render(request, 'fieldmanage/upload_pest.html', {'form': form})
