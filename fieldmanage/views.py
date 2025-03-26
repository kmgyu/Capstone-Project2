from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Field
from .serializers import FieldSerializer

# ✅ 모든 필드 조회 & 생성
class FieldListView(APIView):
    def get(self, request):
        fields = Field.objects.all()
        serializer = FieldSerializer(fields, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = FieldSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ✅ 단일 필드 조회, 수정, 삭제
class FieldDetailView(APIView):
    def get_object(self, pk):
        return get_object_or_404(Field, pk=pk)

    def get(self, request, pk):
        field = self.get_object(pk)
        serializer = FieldSerializer(field)
        return Response(serializer.data)

    def put(self, request, pk):
        field = self.get_object(pk)
        serializer = FieldSerializer(field, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        field = self.get_object(pk)
        field.delete()
        return Response({'message': 'Field deleted'}, status=status.HTTP_204_NO_CONTENT)
