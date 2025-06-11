# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from photoapp.models import FieldPic, PestResult, DiseaseResult
# from fieldmanage.models import Field
import os
import base64
import json

class DamageManageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 필드 이름 및 설명, 멀티폴리곤
        image_file = None
        pic_path = "/home/Capstone-Project2/repository/user_id_18/field_id_28/stupid.jpg"
        if os.path.exists(pic_path):
            with open(pic_path, "rb") as img:
                image_file = base64.b64encode(img.read()).decode("utf-8")

            # Polygon → MultiPolygon 변환
            multipolygon_geojson =  {"type": "MultiPolygon", "coordinates": [[[[127.0358262, 37.50014259], [127.03586196, 37.5002088], [127.03679655, 37.50049568], [127.03692036, 37.50045131], [127.03740886, 37.49941096], [127.03738079, 37.49936177], [127.03666078, 37.49914719], [127.03624357, 37.49933391], [127.0358262, 37.50014259]]]]}
            
        return Response({
            "results": [
                { "field_id":28,
                "field_name":'테스트 노지',
                'description':'임시 테스트용 노지',
                "geometry":json.dumps(multipolygon_geojson),
                
                "type": "pest",
                "name": "벼멸구",
                "field_pic_id": 123,
                "detected_at": "2025-05-28T12:34:56Z",
                "image_file": image_file,
                },
                { "field_id":29,
                "field_name":'테스트 노지',
                "geometry":json.dumps(multipolygon_geojson),
                'description':'임시 테스트',
                "type": "disease",
                "name": "잎집무늬마름병",
                "field_pic_id": 124,
                "detected_at": "2025-05-28T12:38:10Z",
                "image_file": image_file,
                }
            ]
            })

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
