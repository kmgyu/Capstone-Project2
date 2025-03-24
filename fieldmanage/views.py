from bson import ObjectId
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Field
from .serializers import FieldSerializer

# ✅ 모든 필드 조회
# Todo : query string을 입력받으면 그에 해당하는 결과를 내놓아야 함.
# example : 특정 사용자에 대한 노지 데이터 출력
class FieldListView(APIView):
    def get(self, request):
        fields = Field.objects.all()
        serializer = FieldSerializer(fields, many=True)
        return Response(serializer.data)

# ✅ 단일 필드 조회, 생성, 수정, 삭제
class FieldDetailView(APIView):
    def get_object(self, pk):
        try:
            return Field.objects.get(pk=ObjectId(pk))
        except (Field.DoesNotExist, ValueError):
            return None

    def post(self, request):
        serializer = FieldSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request, pk):
        field = self.get_object(pk)
        if field is None:
            return Response({'error': 'Field not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = FieldSerializer(field)
        return Response(serializer.data)

    def put(self, request, pk):
        field = self.get_object(pk)
        if field is None:
            return Response({'error': 'Field not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = FieldSerializer(field, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        field = self.get_object(pk)
        if field is None:
            return Response({'error': 'Field not found'}, status=status.HTTP_404_NOT_FOUND)
        field.delete()
        return Response({'message': 'Field deleted'}, status=status.HTTP_204_NO_CONTENT)