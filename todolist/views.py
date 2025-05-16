import calendar
from django.utils.timezone import make_aware
from datetime import datetime

from .utils import expand_tasks_by_date, deduplicate_tasks_per_day

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

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from konlpy.tag import Okt

okt = Okt()

def deduplicate_for_view(todos, threshold=0.85):
    if len(todos) <= 1:
        return todos

    unique_tasks = []
    vectorizer = TfidfVectorizer(tokenizer=okt.morphs, token_pattern=None)

    # 비교용 텍스트 만들기
    texts = [f"{t.task_name} {t.task_content or ''}" for t in todos]
    vectors = vectorizer.fit_transform(texts)
    similarity = cosine_similarity(vectors)

    used = [False] * len(todos)

    for i in range(len(todos)):
        if used[i]:
            continue
        used[i] = True
        group = [i]

        # i 이후 모든 항목과 비교
        for j in range(i + 1, len(todos)):
            if not used[j] and similarity[i][j] >= threshold:
                group.append(j)
                used[j] = True

        # 같은 그룹 중 priority가 가장 높은 할 일 선택
        best = min(group, key=lambda idx: todos[idx].priority)
        unique_tasks.append(todos[best])

    return unique_tasks

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
    
# 사용자가 소유한 모든 노지의 할 일을 조회(특정 날짜 혹은 한 달치, 파라미터 미입력 시 해당 달의 할 일일)
class AllFieldTodosAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        start = request.query_params.get('start')
        end = request.query_params.get('end')

        # 기본값: 이번 달
        try:
            if start and end:
                start_date = parse_datetime(start)
                end_date = parse_datetime(end)
                if not (start_date and end_date):
                    raise ValueError
            else:
                raise ValueError
        except ValueError:
            today = datetime.today()
            start_date = make_aware(datetime(today.year, today.month, 1))
            _, last_day = calendar.monthrange(today.year, today.month)
            end_date = make_aware(datetime(today.year, today.month, last_day, 23, 59, 59))

        # 사용자 할 일 가져오기
        todos = FieldTodo.objects.filter(owner=user, start_date__range=(start_date, end_date)).order_by('start_date', 'priority')

        # 날짜별로 확장 및 유사 중복 제거
        date_map = expand_tasks_by_date(todos)
        final_result = deduplicate_tasks_per_day(date_map)

        return Response(final_result)
    
# 특정 날의 사용자가 소유한 모든 노지의 할 일을 조회
class DailyTodosAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        date = request.query_params.get("date")
        if not date:
            return Response({'error': 'date 파라미터는 필수입니다.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_date = parse_datetime(date).date()
        except Exception:
            return Response({'error': '날짜 형식이 잘못되었습니다. YYYY-MM-DD 형식으로 주세요.'},
                            status=status.HTTP_400_BAD_REQUEST)

        todos = FieldTodo.objects.filter(owner=user)

        result = []
        for todo in todos:
            todo_dates = [todo.start_date.date() + timedelta(days=i) for i in range(todo.period or 1)]
            if target_date in todo_dates:
                result.append(todo)

        serializer = FieldTodoSerializer(result, many=True)
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
