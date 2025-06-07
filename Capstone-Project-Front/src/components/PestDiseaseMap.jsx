
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MapPin, AlertTriangle, Calendar, Eye, X } from 'lucide-react';
import '../css/PestDiseaseMap.css';
import damageService from '../services/damageService';

const KAKAO_MAP_API_KEY = "0177e5aaa20d0847b3b223ccf30099c7";
const KAKAO_MAP_LIBS = "services,drawing";

// API 데이터를 슬라이드 형태로 변환하는 함수
const transformApiDataToSlides = (apiData) => {
  const fieldGroups = {};
  
  // field_id별로 그룹핑
  apiData.forEach(item => {
    const fieldId = item.field_id;
    if (!fieldGroups[fieldId]) {
      fieldGroups[fieldId] = {
        id: fieldId,
        name: item.field_name,
        description: item.description,
        geometry: JSON.parse(item.geometry),
        pests: []
      };
    }
    
    // 병해충 정보 추가
    fieldGroups[fieldId].pests.push({
      type: item.type === 'pest' ? '충해' : '병해',
      name: item.name,
      field_pic_id: item.field_pic_id,
      detected_at: item.detected_at,
      image_file: item.image_file
    });
  });
  
  return Object.values(fieldGroups);
};

const loadKakaoMapScript = () => {
  if (window.kakao && window.kakao.maps) return Promise.resolve();
  const existScript = document.querySelector('script[src*="dapi.kakao.com/v2/maps/sdk.js"]');
  if (existScript) {
    return new Promise(resolve => {
      existScript.addEventListener('load', resolve);
    });
  }
  return new Promise(resolve => {
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_API_KEY}&autoload=false&libraries=${KAKAO_MAP_LIBS}`;
    script.async = true;
    script.onload = resolve;
    document.head.appendChild(script);
  });
};

const PestDiseaseMap = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideData, setSlideData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const overlaysRef = useRef([]);
  const infoWindowsRef = useRef([]);

  // API 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await damageService.damagemanage();
        const transformedData = transformApiDataToSlides(response.results);
        setSlideData(transformedData);
        setError(null);
      } catch (err) {
        console.error('데이터 로드 실패:', err);
        setError('데이터를 불러오는데 실패했습니다.');
        setSlideData([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slideData.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slideData.length) % slideData.length);

  // 이미지 모달 열기/닫기
  const openImageModal = (imageFile) => {
    setSelectedImage(imageFile);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  // 지도 그리기/슬라이드 변경시마다 갱신
  useEffect(() => {
    if (slideData.length === 0) return;
    
    let isMounted = true;
    loadKakaoMapScript().then(() => {
      if (!isMounted) return;
      window.kakao.maps.load(() => {
        drawMap();
      });
    });
    return () => { isMounted = false; };
    // eslint-disable-next-line
  }, [currentSlide, slideData]);

  // 지도 그리기 함수(폴리곤+원)
  const drawMap = () => {
    let infoWindowJustOpened = false;
    if (slideData.length === 0) return;
    
    const { geometry, pests } = slideData[currentSlide];
    
    // 중심점 계산 (폴리곤의 중심)
    let centerLat = 0, centerLng = 0, pointCount = 0;
    
    if (geometry.type === "Polygon") {
      geometry.coordinates[0].forEach(coord => {
        centerLng += coord[0];
        centerLat += coord[1];
        pointCount++;
      });
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach(polygon => {
        polygon[0].forEach(coord => {
          centerLng += coord[0];
          centerLat += coord[1];
          pointCount++;
        });
      });
    }
    
    centerLat /= pointCount;
    centerLng /= pointCount;
    
    const center = new window.kakao.maps.LatLng(centerLat, centerLng);
    const map = new window.kakao.maps.Map(mapRef.current, {
      center,
      level: 1,
      mapTypeId: window.kakao.maps.MapTypeId.SKYVIEW
    });
    mapInstanceRef.current = map;

    // 이전 오버레이 제거
    overlaysRef.current.forEach(ov => ov.setMap(null));
    overlaysRef.current = [];
    infoWindowsRef.current.forEach(iw => iw.close());
    infoWindowsRef.current = [];

    // 폴리곤 그리기
    if (geometry.type === "Polygon") {
      const path = geometry.coordinates[0].map(coord => 
        new window.kakao.maps.LatLng(coord[1], coord[0])
      );
      const polygon = new window.kakao.maps.Polygon({
        map,
        path,
        strokeWeight: 3,
        strokeColor: '#4d8b31',
        strokeOpacity: 0.8,
        fillColor: '#8bc34a',
        fillOpacity: 0.2
      });
      overlaysRef.current.push(polygon);
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach(polygonArr => {
        polygonArr.forEach(ring => {
          const path = ring.map(coord => new window.kakao.maps.LatLng(coord[1], coord[0]));
          const polygon = new window.kakao.maps.Polygon({
            map,
            path,
            strokeWeight: 3,
            strokeColor: '#4d8b31',
            strokeOpacity: 0.8,
            fillColor: '#8bc34a',
            fillOpacity: 0.2
          });
          overlaysRef.current.push(polygon);
        });
      });
    }

    // 병해충 위치에 마커 표시 (중심점 근처에 랜덤 배치)
    pests.forEach((pest, idx) => {
      const pestLat = centerLat;
      const pestLng = centerLng;

      const circle = new window.kakao.maps.Circle({
        map,
        center: new window.kakao.maps.LatLng(pestLat, pestLng),
        radius: 3,
        strokeWeight: 2,
        strokeColor: '#f44336',
        strokeOpacity: 0.7,
        fillColor: '#f44336',
        fillOpacity: 0.4
      });
      overlaysRef.current.push(circle);

      const infowindow = new window.kakao.maps.InfoWindow({
        position: new window.kakao.maps.LatLng(pestLat, pestLng),
        content: `<div style="font-size:12px;padding:2px 5px;">${pest.type}: ${pest.name}</div>`
      });
      infoWindowsRef.current.push(infowindow);

      // 원 클릭 시 해당 InfoWindow만 열기
      window.kakao.maps.event.addListener(circle, 'click', function () {
        infoWindowsRef.current.forEach(iw => iw.close());
        infowindow.open(map, null); // null로 넣어야 정상 동작!
        infoWindowJustOpened = true; // 2. flag 세팅

      });
    });

    // **지도 클릭 시 모든 InfoWindow 닫기**
    window.kakao.maps.event.addListener(map, 'click', () => {
      if (infoWindowJustOpened) {
        infoWindowJustOpened = false;
        return; // 4. 한 번 무시
      }
      infoWindowsRef.current.forEach(iw => iw.close());
    });
  };
  // 로딩 중이거나 에러 상태 처리
  if (loading) {
    return (
      <div className="pest-disease-container">
        <div className="pest-disease-header">
          <h2>농장 현황</h2>
          <p>데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pest-disease-container">
        <div className="pest-disease-header">
          <h2>농장 현황</h2>
          <p style={{ color: '#f44336' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (slideData.length === 0) {
    return (
      <div className="pest-disease-container">
        <div className="pest-disease-header">
          <h2>농장 현황</h2>
          <p>병해충 데이터가 없습니다.</p>
        </div>
      </div>
    );
  }

  const current = slideData[currentSlide];

  return (
    <div className="pest-disease-container">
      {/* 헤더 */}
      <div className="pest-disease-header">
        <h2>농장 현황</h2>
        <p>실시간 병해충 모니터링 시스템</p>
      </div>

      <div style={{ position: 'relative' }}>
        {/* 메인 컨텐츠 */}
        <div className="pest-disease-content">
          {/* 지도 영역 */}
          <div className="map-section">
            <div className="section-header">
              <MapPin size={20} color="#4d8b31" />
              <h3>위치 정보</h3>
            </div>
            {/* 카카오맵 */}
            <div
              ref={mapRef}
              className="kakao-map"
              style={{
                width: '100%',
                height: '300px',
                borderRadius: '10px',
                border: '1px solid #dcedc8'
              }}
            />

            <div className="location-info">
              <p>{current.name}</p>
              <p>{current.description}</p>
            </div>
          </div>

          {/* 병해충 정보 */}
          <div className="reports-section">
            <div className="section-header">
              <AlertTriangle size={20} color="#f9a03f" />
              <h3>발생 현황</h3>
            </div>

            {current.pests.map((pest, index) => (
              <div key={index} className="report-card">
                <div className="report-header">
                  <div className="report-title">
                    <span className="report-tag">{pest.type}</span>
                    <h4 className="report-name">{pest.name}</h4>
                  </div>
                  <button 
                    className="detail-button"
                    onClick={() => openImageModal(pest.image_file)}
                  >
                    <Eye size={16} />
                    상세보기
                  </button>
                </div>
                <div className="report-date">
                  <Calendar size={14} style={{ marginRight: '4px' }} />
                  발생일: {new Date(pest.detected_at).toLocaleDateString('ko-KR')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 네비게이션 버튼 */}
        {slideData.length > 1 && (
          <>
            <button onClick={prevSlide} className="map-nav-button map-nav-button-left">
              <ChevronLeft size={20} color="#666" />
            </button>
            <button onClick={nextSlide} className="map-nav-button map-nav-button-right">
              <ChevronRight size={20} color="#666" />
            </button>
          </>
        )}
      </div>

      {/* 하단 인디케이터 */}
      {slideData.length > 1 && (
        <div className="indicator-section">
          {slideData.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`indicator-dot ${idx === currentSlide ? 'active' : ''}`}
            />
          ))}
        </div>
      )}

      {/* 이미지 모달 */}
      {selectedImage && (
        <div className="image-modal" onClick={closeImageModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={closeImageModal}>
              <X size={24} />
            </button>
            <img 
              src={`data:image/jpeg;base64,${selectedImage}`} 
              alt="병해충 상세 이미지" 
              className="modal-image"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PestDiseaseMap;