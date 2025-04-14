from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import FieldTodo, Field
from .serializers import FieldTodoSerializer
from rest_framework.permissions import IsAuthenticated


# 사용자 기준 전체 Todo 목록 조회
class FieldTodoUserListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        todos = FieldTodo.objects.filter(owner=request.user)
        serializer = FieldTodoSerializer(todos, many=True)
        return Response(serializer.data)


# 특정 필드 기준 Todo 목록 조회 & 생성
class FieldTodoListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, field_id):
        field = get_object_or_404(Field, pk=field_id, owner=request.user)
        todos = FieldTodo.objects.filter(field=field)
        serializer = FieldTodoSerializer(todos, many=True)
        return Response(serializer.data)

    def post(self, request, field_id):
        try:
            field = Field.objects.get(pk=field_id)
        except Field.DoesNotExist:
            return Response({'detail': 'No Field matches the given query.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()
        data['field'] = field.field_id

        serializer = FieldTodoSerializer(data=data)
        if serializer.is_valid():
            serializer.save(owner=request.user, field=field)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# 특정 Todo 기준 조회/수정/삭제
class FieldTodoDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, task_id, user):
        try:
            todo = FieldTodo.objects.get(pk=task_id)
            if todo.owner != user:
                return None
            return todo
        except FieldTodo.DoesNotExist:
            return None

    def get(self, request, task_id):
        todo = self.get_object(task_id, request.user)
        if not todo:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = FieldTodoSerializer(todo)
        return Response(serializer.data)

    def put(self, request, task_id):
        todo = self.get_object(task_id, request.user)
        serializer = FieldTodoSerializer(todo, data=request.data, partial=True) 
        if serializer.is_valid():
            serializer.save()  # 기존 필드 유지
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, task_id):
        todo = self.get_object(task_id, request.user)
        todo.delete()
        return Response({"detail": "delete success."},status=status.HTTP_204_NO_CONTENT)