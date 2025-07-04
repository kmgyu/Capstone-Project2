from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Field
from .serializers import FieldSerializer
import requests
from django.conf import settings

from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
        

# ✅ 모든 필드 조회 & 생성
class FieldListAPIView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        # 사용자의 필드만 조회
        user = request.user
        fields = Field.objects.filter(owner=user)
        serializer = FieldSerializer(fields, many=True)
        return Response(serializer.data)

    def post(self, request):
        # print(request.user)
        serializer = FieldSerializer(data=request.data)
        if serializer.is_valid():
            # print(serializer.data)
            serializer.save(owner=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ✅ 단일 필드 조회, 수정, 삭제
class FieldDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        return get_object_or_404(Field, pk=pk, owner=user)

    def get(self, request, pk):
        field = self.get_object(pk, request.user)
        serializer = FieldSerializer(field)
        return Response(serializer.data)

    def put(self, request, pk):
        field = self.get_object(pk, request.user)
        serializer = FieldSerializer(field, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(owner=request.user)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        field = self.get_object(pk, request.user)
        field.delete()
        return Response({'message': 'Field deleted'}, status=status.HTTP_204_NO_CONTENT)
    

class GetGeometryAPIView(APIView):
    def post(self, request):
        bbox = request.data.get('bbox')

        if not bbox:
            return Response({"detail": "bbox가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        url = "https://api.vworld.kr/ned/wfs/getPossessionWFS"
        params = {
            "key": settings.VWORLD_API_KEY,
            "domain": "orion.mokpo.ac.kr:8483",
            "typename": "dt_d160",
            "bbox": bbox,
            "maxFeatures": "1",
            "resultType": "results",
            "srsName": "EPSG:4326",
            "output": "json"
        }

        try:
            response = requests.get(url, params=params)
            if response.status_code != 200:
                return Response({"detail": "VWorld API 호출 실패"}, status=status.HTTP_502_BAD_GATEWAY)
            
            data = response.json()
            features = data.get('features')

            if not features:
                return Response({"detail": "해당 bbox에 대한 결과가 없습니다."}, status=status.HTTP_404_NOT_FOUND)

            feature = features[0]
            properties = feature.get('properties', {})
            geometry = feature.get('geometry')

            field_area = properties.get('lndpcl_ar')

            sigungu_code = properties.get('ld_cpsg_code')
            field_address = CITY_CODES.get(sigungu_code, "알 수 없는 지역")

            result = {
                "geometry": geometry,
                "field_area": field_area,
                "field_address": field_address
            }

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"detail": f"서버 오류: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ✅ Field ID와 Field Name을 묶어서 반환
class FieldidListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        fields = Field.objects.filter(owner=user).only('field_id', 'field_name')  # 필요한 필드만 가져옴

        # id와 name만 추출해서 새로운 리스트 구성
        field_list = [{"field_id": field.field_id, "field_name": field.field_name} for field in fields]

        return Response(field_list, status=status.HTTP_200_OK)

        
CITY_CODES = {
    "11110": "서울특별시 종로구",   
    "11140": "서울특별시 중구",
    "11170": "서울특별시 용산구",
    "11200": "서울특별시 성동구",
    "11215": "서울특별시 광진구",
    "11230": "서울특별시 동대문구",
    "11260": "서울특별시 중랑구",
    "11290": "서울특별시 성북구",
    "11305": "서울특별시 강북구",
    "11320": "서울특별시 도봉구",
    "11350": "서울특별시 노원구",
    "11380": "서울특별시 은평구",
    "11410": "서울특별시 서대문구",
    "11440": "서울특별시 마포구",
    "11470": "서울특별시 양천구",
    "11500": "서울특별시 강서구",
    "11530": "서울특별시 구로구",
    "11545": "서울특별시 금천구",
    "11560": "서울특별시 영등포구",
    "11590": "서울특별시 동작구",
    "11620": "서울특별시 관악구",
    "11650": "서울특별시 서초구",
    "11680": "서울특별시 강남구",
    "11710": "서울특별시 송파구",
    "11740": "서울특별시 강동구",
    "26110": "부산광역시 중구",
    "26140": "부산광역시 서구",
    "26170": "부산광역시 동구",
    "26200": "부산광역시 영도구",
    "26230": "부산광역시 부산진구",
    "26260": "부산광역시 동래구",
    "26290": "부산광역시 남구",
    "26320": "부산광역시 북구",
    "26350": "부산광역시 해운대구",
    "26380": "부산광역시 사하구",
    "26410": "부산광역시 금정구",
    "26440": "부산광역시 강서구",
    "26470": "부산광역시 연제구",
    "26500": "부산광역시 수영구",
    "26530": "부산광역시 사상구",
    "26710": "부산광역시 기장군",
    "27110": "대구광역시 중구",
    "27140": "대구광역시 동구",
    "27170": "대구광역시 서구",
    "27200": "대구광역시 남구",
    "27230": "대구광역시 북구",
    "27260": "대구광역시 수성구",
    "27290": "대구광역시 달서구",
    "27710": "대구광역시 달성군",
    "27720": "대구광역시 군위군",
    "28110": "인천광역시 중구",
    "28140": "인천광역시 동구",
    "28177": "인천광역시 미추홀구",
    "28185": "인천광역시 연수구",
    "28200": "인천광역시 남동구",
    "28237": "인천광역시 부평구",
    "28245": "인천광역시 계양구",
    "28260": "인천광역시 서구",
    "28710": "인천광역시 강화군",
    "28720": "인천광역시 옹진군",
    "29110": "광주광역시 동구",
    "29140": "광주광역시 서구",
    "29155": "광주광역시 남구",
    "29170": "광주광역시 북구",
    "29200": "광주광역시 광산구",
    "30110": "대전광역시 동구",
    "30140": "대전광역시 중구",
    "30170": "대전광역시 서구",
    "30200": "대전광역시 유성구",
    "30230": "대전광역시 대덕구",
    "31110": "울산광역시 중구",
    "31140": "울산광역시 남구",
    "31170": "울산광역시 동구",
    "31200": "울산광역시 북구",
    "31710": "울산광역시 울주군",
    "41110": "경기도 수원시",
    "41130": "경기도 성남시",
    "41150": "경기도 의정부시",
    "41170": "경기도 안양시",
    "41190": "경기도 부천시",
    "41210": "경기도 광명시",
    "41220": "경기도 평택시",
    "41250": "경기도 동두천시",
    "41270": "경기도 안산시",
    "41280": "경기도 고양시",
    "41290": "경기도 과천시",
    "41310": "경기도 구리시",
    "41360": "경기도 남양주시",
    "41370": "경기도 오산시",
    "41390": "경기도 시흥시",
    "41410": "경기도 군포시",
    "41430": "경기도 의왕시",
    "41450": "경기도 하남시",
    "41460": "경기도 용인시",
    "41480": "경기도 파주시",
    "41500": "경기도 이천시",
    "41550": "경기도 안성시",
    "41570": "경기도 김포시",
    "41590": "경기도 화성시",
    "41610": "경기도 광주시",
    "41630": "경기도 양주시",
    "41650": "경기도 포천시",
    "41670": "경기도 여주시",
    "41800": "경기도 연천군",
    "41820": "경기도 가평군",
    "41830": "경기도 양평군",
    "43110": "충청북도 청주시",
    "43130": "충청북도 충주시",
    "43150": "충청북도 제천시",
    "43720": "충청북도 보은군",
    "43730": "충청북도 옥천군",
    "43740": "충청북도 영동군",
    "43745": "충청북도 증평군",
    "43750": "충청북도 진천군",
    "43760": "충청북도 괴산군",
    "43770": "충청북도 음성군",
    "43800": "충청북도 단양군",
    "44130": "충청남도 천안시",
    "44150": "충청남도 공주시",
    "44180": "충청남도 보령시",
    "44200": "충청남도 아산시",
    "44210": "충청남도 서산시",
    "44230": "충청남도 논산시",
    "44250": "충청남도 계룡시",
    "44270": "충청남도 당진시",
    "44710": "충청남도 금산군",
    "44760": "충청남도 부여군",
    "44770": "충청남도 서천군",
    "44790": "충청남도 청양군",
    "44800": "충청남도 홍성군",
    "44810": "충청남도 예산군",
    "44825": "충청남도 태안군",
    "46110": "전라남도 목포시",
    "46130": "전라남도 여수시",
    "46150": "전라남도 순천시",
    "46170": "전라남도 나주시",
    "46230": "전라남도 광양시",
    "46710": "전라남도 담양군",
    "46720": "전라남도 곡성군",
    "46730": "전라남도 구례군",
    "46770": "전라남도 고흥군",
    "46780": "전라남도 보성군",
    "46790": "전라남도 화순군",
    "46800": "전라남도 장흥군",
    "46810": "전라남도 강진군",
    "46820": "전라남도 해남군",
    "46830": "전라남도 영암군",
    "46840": "전라남도 무안군",
    "46860": "전라남도 함평군",
    "46870": "전라남도 영광군",
    "46880": "전라남도 장성군",
    "46890": "전라남도 완도군",
    "46900": "전라남도 진도군",
    "46910": "전라남도 신안군",
    "47110": "경상북도 포항시",
    "47130": "경상북도 경주시",
    "47150": "경상북도 김천시",
    "47170": "경상북도 안동시",
    "47190": "경상북도 구미시",
    "47210": "경상북도 영주시",
    "47230": "경상북도 영천시",
    "47250": "경상북도 상주시",
    "47280": "경상북도 문경시",
    "47290": "경상북도 경산시",
    "47730": "경상북도 의성군",
    "47750": "경상북도 청송군",
    "47760": "경상북도 영양군",
    "47770": "경상북도 영덕군",
    "47820": "경상북도 청도군",
    "47830": "경상북도 고령군",
    "47840": "경상북도 성주군",
    "47850": "경상북도 칠곡군",
    "47900": "경상북도 예천군",
    "47920": "경상북도 봉화군",
    "47930": "경상북도 울진군",
    "47940": "경상북도 울릉군",
    "48120": "경상남도 창원시",
    "48170": "경상남도 진주시",
    "48220": "경상남도 통영시",
    "48240": "경상남도 사천시",
    "48250": "경상남도 김해시",
    "48270": "경상남도 밀양시",
    "48310": "경상남도 거제시",
    "48330": "경상남도 양산시",
    "48720": "경상남도 의령군",
    "48730": "경상남도 함안군",
    "48740": "경상남도 창녕군",
    "48820": "경상남도 고성군",
    "48840": "경상남도 남해군",
    "48850": "경상남도 하동군",
    "48860": "경상남도 산청군",
    "48870": "경상남도 함양군",
    "48880": "경상남도 거창군",
    "48890": "경상남도 합천군",
    "50110": "제주특별자치도 제주시",
    "50130": "제주특별자치도 서귀포시",
    "51110": "강원특별자치도 춘천시",
    "51130": "강원특별자치도 원주시",
    "51150": "강원특별자치도 강릉시",
    "51170": "강원특별자치도 동해시",
    "51190": "강원특별자치도 태백시",
    "51210": "강원특별자치도 속초시",
    "51230": "강원특별자치도 삼척시",
    "51720": "강원특별자치도 홍천군",
    "51730": "강원특별자치도 횡성군",
    "51750": "강원특별자치도 영월군",
    "51760": "강원특별자치도 평창군",
    "51770": "강원특별자치도 정선군",
    "51780": "강원특별자치도 철원군",
    "51790": "강원특별자치도 화천군",
    "51800": "강원특별자치도 양구군",
    "51810": "강원특별자치도 인제군",
    "51820": "강원특별자치도 고성군",
    "51830": "강원특별자치도 양양군",
    "52110": "전북특별자치도 전주시",
    "52130": "전북특별자치도 군산시",
    "52140": "전북특별자치도 익산시",
    "52180": "전북특별자치도 정읍시",
    "52190": "전북특별자치도 남원시",
    "52210": "전북특별자치도 김제시",
    "52710": "전북특별자치도 완주군",
    "52720": "전북특별자치도 진안군",
    "52730": "전북특별자치도 무주군",
    "52740": "전북특별자치도 장수군",
    "52750": "전북특별자치도 임실군",
    "52770": "전북특별자치도 순창군",
    "52790": "전북특별자치도 고창군",
    "52800": "전북특별자치도 부안군",
}
