# todolist/views/keyword_views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from fieldmanage.models import MonthlyKeyword, Field
from fieldmanage.serializers import MonthlyKeywordSerializer

class MonthlyKeywordCRUDAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_keyword_obj(self, field, year, month):
        try:
            return MonthlyKeyword.objects.get(field=field, year=year, month=month)
        except MonthlyKeyword.DoesNotExist:
            return None

    def get(self, request, field_id):
        year = request.query_params.get("year")
        month = request.query_params.get("month")
        if not (year and month):
            return Response({"error": "year, month는 필수입니다."}, status=400)

        field = get_object_or_404(Field, id=field_id, owner=request.user)
        keyword_obj = self.get_keyword_obj(field, year, month)
        if not keyword_obj:
            return Response({"detail": "해당 키워드가 존재하지 않습니다."}, status=404)

        return Response({"keywords": keyword_obj.keywords})

    def post(self, request, field_id):
        field = get_object_or_404(Field, id=field_id, owner=request.user)
        data = request.data.copy()
        data["field"] = field.id

        serializer = MonthlyKeywordSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, field_id):
        field = get_object_or_404(Field, id=field_id, owner=request.user)
        year = request.data.get("year")
        month = request.data.get("month")
        if not (year and month):
            return Response({"error": "year, month는 필수입니다."}, status=400)

        keyword_obj = self.get_keyword_obj(field, year, month)
        if not keyword_obj:
            return Response({"detail": "수정할 키워드가 존재하지 않습니다."}, status=404)

        serializer = MonthlyKeywordSerializer(keyword_obj, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, field_id):
        field = get_object_or_404(Field, id=field_id, owner=request.user)
        year = request.query_params.get("year")
        month = request.query_params.get("month")
        if not (year and month):
            return Response({"error": "year, month는 필수입니다."}, status=400)

        keyword_obj = self.get_keyword_obj(field, year, month)
        if not keyword_obj:
            return Response({"detail": "삭제할 키워드가 존재하지 않습니다."}, status=404)

        keyword_obj.delete()
        return Response({"detail": "삭제 완료"}, status=204)
