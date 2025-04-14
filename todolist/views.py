from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import FieldTodo
from .serializers import FieldTodoSerializer
from django.shortcuts import get_object_or_404

# ✅ 전체 할 일 목록 조회
class FieldTodoListView(APIView):
    def get(self, request):
        todos = FieldTodo.objects.all()
        serializer = FieldTodoSerializer(todos, many=True)
        return Response(serializer.data)

# ✅ 단일 할 일 CRUD
class FieldTodoDetailView(APIView):
    def get_object(self, pk):
        return get_object_or_404(FieldTodo, pk=pk)

    def get(self, request, pk):
        todo = self.get_object(pk)
        serializer = FieldTodoSerializer(todo)
        return Response(serializer.data)

    def post(self, request):
        serializer = FieldTodoSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        todo = self.get_object(pk)
        serializer = FieldTodoSerializer(todo, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        todo = self.get_object(pk)
        todo.delete()
        return Response({'message': '할 일이 삭제되었습니다.'}, status=status.HTTP_204_NO_CONTENT)
