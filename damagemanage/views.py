# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from photoapp.models import FieldPic, PestResult, DiseaseResult
# from fieldmanage.models import Field


class DamageManageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        field_id = request.query_params.get('field_id')
        damage_type = request.query_params.get('type')  # 'pest', 'disease', 또는 None

        # 유저의 필드에 속한 FieldPic만 조회
        pics = FieldPic.objects.filter(field__user=user)
        if field_id:
            pics = pics.filter(field__id=field_id)

        results = []

        if damage_type in [None, 'pest']:
            pest_qs = PestResult.objects.filter(field_pic__in=pics)
            for pest in pest_qs:
                results.append({
                    "type": "pest",
                    "name": pest.pest_name,
                    "field_pic_id": pest.field_pic.field_pic_id,
                    "detected_at": pest.detected_at,
                    "image_url": f"/media/{pest.field_pic.pic_path}" if pest.field_pic.pic_path else None
                })

        if damage_type in [None, 'disease']:
            disease_qs = DiseaseResult.objects.filter(field_pic__in=pics)
            for disease in disease_qs:
                results.append({
                    "type": "disease",
                    "name": disease.disease_name,
                    "field_pic_id": disease.field_pic.field_pic_id,
                    "detected_at": disease.detected_at,
                    "image_url": f"/media/{disease.field_pic.pic_path}" if disease.field_pic.pic_path else None
                })

        return Response({"results": results})
