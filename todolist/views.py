from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import FieldTodo, Field
from .serializers import FieldTodoSerializer

# 사용자 기준 전체 Todo 조회
class UserTodoListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        todos = FieldTodo.objects.filter(owner=user)
        serializer = FieldTodoSerializer(todos, many=True)
        return Response(serializer.data)


# 필드 기준 전체 Todo 조회
class FieldTodoListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, field_id):
        user = request.user
        todos = FieldTodo.objects.filter(owner=user, field_id=field_id)
        serializer = FieldTodoSerializer(todos, many=True)
        return Response(serializer.data)


# Todo 생성 (owner 기준)
class FieldTodoCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = FieldTodoSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(owner=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# 단일 Todo 조회/수정/삭제
class FieldTodoDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, task_id, user):
        return get_object_or_404(FieldTodo, task_id=task_id, owner=user)

    def get(self, request, task_id):
        todo = self.get_object(task_id, request.user)
        serializer = FieldTodoSerializer(todo)
        return Response(serializer.data)

    def put(self, request, task_id):
        todo = self.get_object(task_id, request.user)
        serializer = FieldTodoSerializer(todo, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, task_id):
        todo = self.get_object(task_id, request.user)
        todo.delete()
        return Response({'message': 'Todo deleted'}, status=status.HTTP_204_NO_CONTENT)
