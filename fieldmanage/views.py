from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Field
from .serializers import FieldSerializer

from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
        

# ✅ 모든 필드 조회 & 생성
class FieldListAPIView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        # 사용자의 필드만 조회
        user = request.user
        fields = Field.objects.filter(owner=user)
        serializer = FieldSerializer(fields, many=True)
        return Response(serializer.data)

    def post(self, request):
        # print(request.user)
        serializer = FieldSerializer(data=request.data)
        if serializer.is_valid():
            # print(serializer.data)
            serializer.save(owner=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ✅ 단일 필드 조회, 수정, 삭제
class FieldDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        return get_object_or_404(Field, pk=pk, owner=user)

    def get(self, request, pk):
        field = self.get_object(pk, request.user)
        serializer = FieldSerializer(field)
        return Response(serializer.data)

    def put(self, request, pk):
        field = self.get_object(pk, request.user)
        serializer = FieldSerializer(field, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        field = self.get_object(pk, request.user)
        field.delete()
        return Response({'message': 'Field deleted'}, status=status.HTTP_204_NO_CONTENT)
