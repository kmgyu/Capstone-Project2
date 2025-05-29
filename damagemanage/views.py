# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from photoapp.models import FieldPic, PestResult, DiseaseResult
# from fieldmanage.models import Field
import os

class DamageManageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 필드 이름 및 설명, 멀티폴리곤
        image_file = None
        pic_path = "Project2/repository/user_id_18/field_id_28/stupid.jpg"
        if os.path.exists(pic_path):
            image_file = open(pic_path, 'rb').read()
        
        return {
            "results": [
                { "field_id":28,
                "field_name":'테스트 노지',
                'description':'임시 테스트용 노지',
                "geometry":{'28', '테스트 노지', '광주광역시 서구 치평동', '100', '상추', '2025-05-11', '{\"type\": \"Polygon\", \"coordinates\": [[[126.792, 35.145], [126.793, 35.145], [126.793, 35.146], [126.792, 35.146], [126.792, 35.145]]]}', '임시 테스트용 노지', '18'},
                
                "type": "pest",
                "name": "벼멸구",
                "field_pic_id": 123,
                "detected_at": "2025-05-28T12:34:56Z",
                "image_file": image_file,
                },
                { "field_id":29,
                "field_name":'테스트 노지',
                "geometry":{'28', '테스트 노지', '광주광역시 서구 치평동', '100', '상추', '2025-05-11', '{\"type\": \"Polygon\", \"coordinates\": [[[126.792, 35.145], [126.793, 35.145], [126.793, 35.146], [126.792, 35.146], [126.792, 35.145]]]}', '임시 테스트용 노지', '18'},
                'description':'임시 테스트',
                "type": "disease",
                "name": "잎집무늬마름병",
                "field_pic_id": 124,
                "detected_at": "2025-05-28T12:38:10Z",
                "image_file": image_file,
                }
            ]
            }

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
