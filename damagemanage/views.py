from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from photoapp.models import FieldPic, PestResult, DiseaseResult
from fieldmanage.models import Field
import base64
import os

class DamageManageView(APIView):
    permission_classes = [IsAuthenticated]  # 인증된 사용자만 접근 허용

    def get(self, request):
        user = request.user  # 현재 요청을 보낸 사용자
        field_id = request.query_params.get('field_id')  # 쿼리스트링에서 필드 ID 추출

        # 현재 사용자에게 속한 모든 노지를 가져옴
        fields = Field.objects.filter(owner=user)
        
        # 쿼리스트링에 field_id가 있을 경우 해당 노지만 필터링
        if field_id:
            fields = fields.filter(field_id=field_id)

        # 필터링된 노지들에 속한 모든 FieldPic 조회
        field_pics = FieldPic.objects.filter(field__in=fields)

        results = []  # 응답할 데이터 리스트 초기화

        # 병해충 타입 구분 없이 pest_result 전부 가져옴
        pest_qs = PestResult.objects.filter(field_pic__in=field_pics).select_related('field_pic__field')
        for pest in pest_qs:
            pic = pest.field_pic
            field = pic.field

            # 이미지 파일이 존재하는 경우 base64 인코딩
            image_file = None
            if pic.pic_path and os.path.exists(pic.pic_path):
                with open(pic.pic_path, "rb") as img:
                    image_file = base64.b64encode(img.read()).decode("utf-8")

            # pest 결과 하나를 딕셔너리로 구성하여 results에 추가
            results.append({
                "type": "pest",  # 결과 유형
                "name": pest.pest_name,  # 해충 이름
                "field_pic_id": pic.field_pic_id,  # 이미지 ID
                "detected_at": pest.detected_at,  # 탐지 일시
                "image_file": image_file,  # 인코딩된 이미지 파일
                "field_id": field.field_id,  # 노지 ID
                "field_name": field.field_name,  # 노지 이름
                "description": field.description,  # 노지 설명
                "geometry": field.geometry,  # GeoJSON 형태의 위치 정보
            })

        # disease_result 전부 가져옴
        disease_qs = DiseaseResult.objects.filter(field_pic__in=field_pics).select_related('field_pic__field')
        for disease in disease_qs:
            pic = disease.field_pic
            field = pic.field

            # 이미지 파일이 존재하는 경우 base64 인코딩
            image_file = None
            if pic.pic_path and os.path.exists(pic.pic_path):
                with open(pic.pic_path, "rb") as img:
                    image_file = base64.b64encode(img.read()).decode("utf-8")

            # disease 결과 하나를 딕셔너리로 구성하여 results에 추가
            results.append({
                "type": "disease",  # 결과 유형
                "name": disease.disease_name,  # 병해 이름
                "field_pic_id": pic.field_pic_id,  # 이미지 ID
                "detected_at": disease.detected_at,  # 탐지 일시
                "image_file": image_file,  # 인코딩된 이미지 파일
                "field_id": field.field_id,  # 노지 ID
                "field_name": field.field_name,  # 노지 이름
                "description": field.description,  # 노지 설명
                "geometry": field.geometry,  # GeoJSON 형태의 위치 정보
            })

        # pest + disease 결과 모두를 포함한 응답 반환
        return Response({"results": results})

# class DamageManageView(APIView):
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         user = request.user
#         field_id = request.query_params.get('field_id')
#         damage_type = request.query_params.get('type')  # 'pest', 'disease', 또는 None

#         # 유저의 필드에 속한 FieldPic만 조회
#         pics = FieldPic.objects.filter(field__user=user)
#         if field_id:
#             pics = pics.filter(field__id=field_id)

#         results = []

#         if damage_type in [None, 'pest']:
#             pest_qs = PestResult.objects.filter(field_pic__in=pics)
#             for pest in pest_qs:
#                 results.append({
#                     "type": "pest",
#                     "name": pest.pest_name,
#                     "field_pic_id": pest.field_pic.field_pic_id,
#                     "detected_at": pest.detected_at,
#                     "image_url": f"/media/{pest.field_pic.pic_path}" if pest.field_pic.pic_path else None
#                 })

#         if damage_type in [None, 'disease']:
#             disease_qs = DiseaseResult.objects.filter(field_pic__in=pics)
#             for disease in disease_qs:
#                 results.append({
#                     "type": "disease",
#                     "name": disease.disease_name,
#                     "field_pic_id": disease.field_pic.field_pic_id,
#                     "detected_at": disease.detected_at,
#                     "image_url": f"/media/{disease.field_pic.pic_path}" if disease.field_pic.pic_path else None
#                 })

#         return Response({"results": results})
