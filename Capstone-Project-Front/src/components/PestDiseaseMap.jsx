import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MapPin, AlertTriangle, Calendar, Thermometer } from 'lucide-react';
import '../css/PestDiseaseMap.css';

const KAKAO_MAP_API_KEY = "0177e5aaa20d0847b3b223ccf30099c7";
const KAKAO_MAP_LIBS = "services,drawing";

// 농지/병해충 슬라이드 샘플 데이터 (각 농지에 멀티폴리곤+병해충배열+날씨 등)
const slideData = [
  {
    id: 1,
    name: "목포 농장 A",
    location: "전라남도 목포시",
    description: "노지 관측 및 드론 관제 테스트 현장입니다.",
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [126.654, 37.123],
            [126.655, 37.124],
            [126.656, 37.124],
            [126.655, 37.123],
            [126.654, 37.123]
          ]
        ]
      ]
    },
    pests: [
      { lat: 37.1235, lng: 126.6545, type: "병해", name: "잎마름병", severity: "중간", date: "2024-05-20", weather: { temp: "23°C", humidity: "65%" } },
      { lat: 37.1236, lng: 126.6547, type: "충해", name: "멸강나방", severity: "낮음", date: "2024-05-18", weather: { temp: "23°C", humidity: "65%" } }
    ]
  },
  {
    id: 2,
    name: "해남 밭 B",
    location: "전라남도 해남군",
    description: "여름철 병해충 집중 관리 구역.",
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [126.661, 37.127],
            [126.662, 37.128],
            [126.663, 37.127],
            [126.662, 37.126],
            [126.661, 37.127]
          ]
        ]
      ]
    },
    pests: [
      { lat: 37.1272, lng: 126.6622, type: "충해", name: "총채벌레", severity: "중간", date: "2024-05-20", weather: { temp: "26°C", humidity: "58%" } }
    ]
  },
  {
    id: 3,
    name: "과수원 관리지",
    location: "충청남도 천안시",
    description: "사과나무 병해충 발생 모니터링",
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [127.121, 36.788],
            [127.123, 36.789],
            [127.124, 36.788],
            [127.123, 36.787],
            [127.121, 36.788]
          ]
        ]
      ]
    },
    pests: [
      { lat: 36.7886, lng: 127.1222, type: "병해", name: "갈색무늬병", severity: "높음", date: "2024-05-22", weather: { temp: "19°C", humidity: "72%" } },
      { lat: 36.7889, lng: 127.1232, type: "충해", name: "진딧물", severity: "중간", date: "2024-05-21", weather: { temp: "19°C", humidity: "72%" } }
    ]
  }
];

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

const getSeverityClass = (severity) => {
  switch (severity) {
    case '높음': return 'severity-high';
    case '중간': return 'severity-medium';
    case '낮음': return 'severity-low';
    default: return '';
  }
};

const PestDiseaseMap = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const overlaysRef = useRef([]); // 폴리곤, 원 모두 이 배열에서 관리

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slideData.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slideData.length) % slideData.length);

  // 지도 그리기/슬라이드 변경시마다 갱신
  useEffect(() => {
    let isMounted = true;
    loadKakaoMapScript().then(() => {
      if (!isMounted) return;
      window.kakao.maps.load(() => {
        drawMap();
      });
    });
    return () => { isMounted = false; };
    // eslint-disable-next-line
  }, [currentSlide]);

  // 지도 그리기 함수(멀티폴리곤+원)
  const drawMap = () => {
    const { geometry, pests } = slideData[currentSlide];
    // 중심: 해당 노지 첫 좌표
    const firstCoord = geometry.coordinates[0][0][0];
    const center = new window.kakao.maps.LatLng(firstCoord[1], firstCoord[0]);
    const map = new window.kakao.maps.Map(mapRef.current, {
      center,
      level: 3,
      mapTypeId: window.kakao.maps.MapTypeId.SKYVIEW
    });
    mapInstanceRef.current = map;

    // 이전 오버레이(폴리곤, 원) 제거
    overlaysRef.current.forEach(ov => ov.setMap(null));
    overlaysRef.current = [];

    // 멀티폴리곤 모두 그리기
    geometry.coordinates.forEach(polygonArr => {
      // polygonArr: [ [ [lng, lat], ... ] ]
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

    // 병해충 위치에 반경 5m 원
    pests.forEach((pest, idx) => {
      const circle = new window.kakao.maps.Circle({
        map,
        center: new window.kakao.maps.LatLng(pest.lat, pest.lng),
        radius: 5,
        strokeWeight: 2,
        strokeColor: '#f44336',
        strokeOpacity: 0.7,
        fillColor: '#f44336',
        fillOpacity: 0.3
      });
      overlaysRef.current.push(circle);

      // 클릭시 인포윈도우(병해충명)
      const infowindow = new window.kakao.maps.InfoWindow({
        position: new window.kakao.maps.LatLng(pest.lat, pest.lng),
        content: `<div style="font-size:12px;padding:2px 5px;">${pest.type}: ${pest.name}</div>`
      });
      window.kakao.maps.event.addListener(circle, 'click', () => {
        infowindow.open(map);
      });
    });
  };

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
              <p>{current.location}</p>
              <p>{current.description}</p>
              <div className="coordinates-info">
                <span>
                  {/* 대표 좌표 노출 */}
                  위도: {current.geometry.coordinates[0][0][0][1]} / 경도: {current.geometry.coordinates[0][0][0][0]}
                </span>
              </div>
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
                  <span className={`severity-badge ${getSeverityClass(pest.severity)}`}>
                    {pest.severity}
                  </span>
                </div>
                <div className="report-date">
                  <Calendar size={14} style={{ marginRight: '4px' }} />
                  발생일: {pest.date}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 네비게이션 버튼 */}
        {/* <button onClick={prevSlide} className="map-nav-button map-nav-button-left">
          <ChevronLeft size={20} color="#666" />
        </button>
        <button onClick={nextSlide} className="map-nav-button map-nav-button-right">
          <ChevronRight size={20} color="#666" />
        </button> */}
      </div>

      {/* 하단 인디케이터 */}
      <div className="indicator-section">
        {slideData.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`indicator-dot ${idx === currentSlide ? 'active' : ''}`}
          />
        ))}
      </div>
    </div>
  );
};

export default PestDiseaseMap;
