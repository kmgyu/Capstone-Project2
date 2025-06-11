import calendar
from django.utils.timezone import make_aware
from datetime import datetime


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from django.utils.dateparse import parse_datetime
from datetime import timedelta

from .models import FieldTodo, Field, TaskProgress
from fieldmanage.models import MonthlyKeyword
from .serializers import FieldTodoSerializer, TaskProgressUpdateSerializer
from .utils import create_task_progress_entries

# 한달 할 일 조회
class MonthlyFieldTodoAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, field_id):
        user = request.user
        year = request.query_params.get('year')
        month = request.query_params.get('month')

        if not (year and month):
            return Response({'error': 'year와 month는 필수입니다.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            year = int(year)
            month = int(month)
            start_date = make_aware(datetime(year, month, 1))
            _, last_day = calendar.monthrange(year, month)
            end_date = make_aware(datetime(year, month, last_day, 23, 59, 59))
        except Exception:
            return Response({'error': 'year 또는 month 형식이 잘못되었습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        field = get_object_or_404(Field, pk=field_id, owner=user)
        todos = FieldTodo.objects.filter(
            owner=user,
            field=field,
            start_date__range=(start_date, end_date)
        )

        # ✅ 키워드 가져오기
        keywords = []
        try:
            mk = MonthlyKeyword.objects.get(field=field, year=year, month=month)
            keywords = mk.keywords
        except MonthlyKeyword.DoesNotExist:
            pass

        return Response({
            "todos": FieldTodoSerializer(todos, many=True).data,
            "keywords": keywords
        })
    
class AllFieldTodosAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        todos = FieldTodo.objects.filter(owner=user)

        start = request.query_params.get('start')
        end = request.query_params.get('end')

        if start and end:
            try:
                start_date = parse_datetime(start)
                end_date = parse_datetime(end)
                if not (start_date and end_date):
                    raise ValueError

                # 🛠️ aware datetime으로 변환
                if start_date.tzinfo is None:
                    start_date = make_aware(start_date)
                if end_date.tzinfo is None:
                    end_date = make_aware(end_date)

                todos = todos.filter(start_date__range=(start_date, end_date))
            except ValueError:
                return Response({'error': '날짜 형식이 잘못되었습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = FieldTodoSerializer(todos, many=True)
        return Response(serializer.data)
    
# 사용자 기준 Todo 기간 목록 조회 및 생성
class FieldTodoListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, field_id=None):
        user = request.user
        todos = FieldTodo.objects.filter(owner=user)

        # 필드 기준 필터링
        if field_id:
            field = get_object_or_404(Field, pk=field_id, owner=user)
            todos = todos.filter(field=field)

        # 날짜 필터링 (선택적)
        start = request.query_params.get('start')
        end = request.query_params.get('end')
        if start and end:
            try:
                start_date = parse_datetime(start)
                end_date = parse_datetime(end)
                if not (start_date and end_date):
                    raise ValueError
                todos = todos.filter(start_date__range=(start_date, end_date))
            except ValueError:
                return Response({'error': '날짜 형식이 잘못되었습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = FieldTodoSerializer(todos, many=True)
        return Response(serializer.data)

    # 할 일 생성성
    def post(self, request, field_id):
        user = request.user

        try:
            field = Field.objects.get(pk=field_id)
        except Field.DoesNotExist:
            return Response({'detail': 'No Field matches the given query.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()
        data['field'] = field.field_id
        data['cycle'] = 0  # ✅ 무조건 0으로 고정

        serializer = FieldTodoSerializer(data=data)
        if serializer.is_valid():
            task = serializer.save(owner=user, field=field)

            # ✅ 진행도 자동 생성
            create_task_progress_entries(task)

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

    def patch(self, request, task_id):
        todo = self.get_object(task_id, request.user)
        if not todo:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = FieldTodoSerializer(todo, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, task_id):
        todo = self.get_object(task_id, request.user)
        todo.delete()
        return Response({"detail": "delete success."},status=status.HTTP_204_NO_CONTENT)
    
    
class TaskProgressUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, task_id):
        user = request.user

        task = get_object_or_404(FieldTodo, pk=task_id)
        if task.owner != user:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)

        progresses = request.data.get('progresses')
        if not progresses or not isinstance(progresses, list):
            return Response({"error": "progresses는 리스트 형태여야 합니다."}, status=status.HTTP_400_BAD_REQUEST)

        for item in progresses:
            serializer = TaskProgressUpdateSerializer(data=item)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            date = serializer.validated_data['date']
            status_value = serializer.validated_data['status']

            progress, created = TaskProgress.objects.get_or_create(
                task_id=task,
                date=date,
                defaults={'status': status_value}
            )

            if created:
                # 새로 생성되었고 상태가 'done'이면 cycle += 1
                if status_value == 'done':
                    task.cycle += 1
                    task.save()
            else:
                prev_status = progress.status

                if prev_status != 'done' and status_value == 'done':
                    task.cycle += 1
                    task.save()
                elif prev_status == 'done' and status_value != 'done':
                    task.cycle = max(0, task.cycle - 1)
                    task.save()

                progress.status = status_value
                progress.save()

        return Response({"detail": "진행도 업데이트 완료."}, status=status.HTTP_200_OK)
