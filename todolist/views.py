from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from django.utils.dateparse import parse_datetime
from datetime import timedelta

from .models import FieldTodo, Field
from .serializers import FieldTodoSerializer


# 사용자 기준 Todo 목록 조회 및 생성
class FieldTodoListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, field_id=None):
        user = request.user
        start = request.query_params.get('start')
        end = request.query_params.get('end')
        mode = request.query_params.get('mode')  # daily, biweekly, monthly

        # start는 필수
        if not start:
            return Response({'error': 'start 날짜가 필요합니다.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            start_date = parse_datetime(start)
            if not start_date:
                raise ValueError
        except ValueError:
            return Response({'error': 'start 날짜 형식이 잘못되었습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        # end가 없을 경우 mode에 따라 자동 계산
        if not end:
            if mode == "daily":
                end_date = start_date + timedelta(days=1)
            elif mode == "biweekly":
                end_date = start_date + timedelta(days=14)
            elif mode == "monthly":
                end_date = start_date + timedelta(days=30)
            else:
                return Response({'error': 'mode가 올바르지 않거나 end가 없습니다.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            try:
                end_date = parse_datetime(end)
                if not end_date:
                    raise ValueError
            except ValueError:
                return Response({'error': 'end 날짜 형식이 잘못되었습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        todos = FieldTodo.objects.filter(
            owner=user,
            start_date__range=(start_date, end_date)
        )

        if field_id:
            field = get_object_or_404(Field, pk=field_id, owner=user)
            todos = todos.filter(field=field)

        serializer = FieldTodoSerializer(todos, many=True)
        return Response(serializer.data)

    def post(self, request, field_id):
        user = request.user

        try:
            field = Field.objects.get(pk=field_id)
        except Field.DoesNotExist:
            return Response({'detail': 'No Field matches the given query.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()
        data['field'] = field.field_id

        serializer = FieldTodoSerializer(data=data)
        if serializer.is_valid():
            serializer.save(owner=user, field=field)
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