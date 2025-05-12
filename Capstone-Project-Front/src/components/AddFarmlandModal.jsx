import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import farmlandService from '../services/farmlandService';
import { 
  faSearch, 
  faMapMarkerAlt, 
  faPen, 
  faTrash, 
  faSave,
  faSquare
} from '@fortawesome/free-solid-svg-icons';
import '../css/AddFarmlandModal.css';

const AddFarmlandModal = ({ isOpen, onClose, onAddFarmland }) => {
  // 맵 관련 상태 및 참조
  const mapContainer = useRef(null);
  const map = useRef(null);
  const drawingManager = useRef(null);
  const rectangle = useRef(null);
  
  // 폼 상태
  const [farmlandName, setFarmlandName] = useState('');
  const [farmlandDescription, setFarmlandDescription] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [drawingMode, setDrawingMode] = useState(false);
  const [rectangleBounds, setRectangleBounds] = useState(null);
  const [area, setArea] = useState(0);
  const [mapScriptLoaded, setMapScriptLoaded] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [isValidationPassed, setIsValidationPassed] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  // 서비스 참조
  const ps = useRef(null);
  const infowindow = useRef(null);
  
  // 사각형 검증
  const handleVerifyBBox = async () => {
    if (!rectangleBounds) {
      setIsValidationPassed(false);
      setValidationMessage('먼저 사각형을 그려주세요.');
      return;
    }

    const sw = rectangleBounds.getSouthWest();
    const ne = rectangleBounds.getNorthEast();
    const bboxString = `${sw.getLat()},${sw.getLng()},${ne.getLat()},${ne.getLng()},EPSG:4326`;

    const result = await farmlandService.getGeometryByBBox(bboxString);

    if (result.success) {
      const coordinates = result.data.coordinates;
      console.log(coordinates);
      if (coordinates && coordinates.length > 0) {
        console.log('Geometry 좌표:', coordinates);
        drawGeometryPolygon(coordinates);
        alert('필지 조회 및 표시 성공!');
      } else {
        console.error('유효하지 않은 좌표 데이터:', coordinates);
        alert('유효한 좌표를 찾을 수 없습니다.');
      }
    } else {
      alert(`필지 조회 실패: ${result.error}`);
    }
  };

  // 응답 폴리곤 그리기
  const drawGeometryPolygon = (coordinates) => {
    if (!map.current || !window.kakao || !window.kakao.maps) return;

    // 멀티폴리곤의 첫 번째 폴리곤의 첫 번째 링을 사용
    const coordinatesArray = coordinates?.[0]?.[0];

    if (!coordinatesArray || coordinatesArray.length === 0) {
      console.error('유효하지 않은 좌표 데이터입니다:', coordinates);
      return;
    }

    // 기존 폴리곤 제거
    if (rectangle.current) {
      rectangle.current.setMap(null);
      rectangle.current = null;
    }

    const path = coordinatesArray.map(coord => 
      new window.kakao.maps.LatLng(coord[1], coord[0])
    );

    const polygon = new window.kakao.maps.Polygon({
      path: path,
      strokeWeight: 3,
      strokeColor: '#FF0000',
      strokeOpacity: 0.8,
      strokeStyle: 'solid',
      fillColor: '#FF0000',
      fillOpacity: 0.3
    });

    polygon.setMap(map.current);

    // 지도 중심 이동
    const bounds = new window.kakao.maps.LatLngBounds();
    path.forEach(point => bounds.extend(point));
    map.current.setBounds(bounds);

    // 상태 저장
    rectangle.current = polygon;
  };



  // 맵 초기화 함수
  const initializeMap = () => {
    try {
      console.log("맵 DOM 요소 크기:", mapContainer.current.offsetWidth, "x", mapContainer.current.offsetHeight);
      
      if (!window.kakao || !window.kakao.maps) {
        console.error("카카오맵 API가 로드되지 않았습니다.");
        return;
      }
      
      // 맵 컨테이너 크기 확인
      if (mapContainer.current.offsetWidth === 0 || mapContainer.current.offsetHeight === 0) {
        console.error("맵 컨테이너 크기가 0입니다");
        return;
      }
      
      const options = {
        center: new window.kakao.maps.LatLng(36.5, 127.5), // 한국 중심 좌표
        level: 11 // 초기 줌 레벨
      };

      map.current = new window.kakao.maps.Map(mapContainer.current, options);
      
      // 장소 검색 객체 생성
      ps.current = new window.kakao.maps.services.Places();
      
      // 인포윈도우 생성
      infowindow.current = new window.kakao.maps.InfoWindow({ zIndex: 1 });

      // Drawing Manager 생성
      const drawingManagerOptions = {
        map: map.current,         // 그리기를 표시할 맵
        drawingMode: null,        // 초기 그리기 모드 (null = 그리기 모드 아님)
        drawingControl: false,    // 기본 그리기 컨트롤 표시 여부
        rectangleOptions: {
          strokeColor: '#39DE2A', // 선 색
          strokeWeight: 3,        // 선 두께
          strokeOpacity: 0.8,     // 선 불투명도
          strokeStyle: 'solid',   // 선 스타일
          fillColor: '#39DE2A',   // 채우기 색
          fillOpacity: 0.3        // 채우기 불투명도
        }
      };
      
      drawingManager.current = new window.kakao.maps.drawing.DrawingManager(drawingManagerOptions);
      
      // 사각형 그리기 완료 이벤트 등록
      window.kakao.maps.event.addListener(drawingManager.current, 'drawend', function(data) {
        // 그려진 사각형 정보 가져오기
        const bounds = data.target.getBounds();
        setRectangleBounds(bounds);
        rectangle.current = data.target;
        
        // 면적 계산
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        calculateRectangleArea(sw, ne);
        
        // 그리기 모드 비활성화
        setDrawingMode(false);
      });
      
      // 오버레이가 삭제될 때 이벤트 처리
      window.kakao.maps.event.addListener(drawingManager.current, 'remove', function(data) {
        // 사각형 상태 초기화
        setRectangleBounds(null);
        rectangle.current = null;
        setArea(0);
      });
      
      setMapInitialized(true);
      console.log("카카오맵이 초기화되었습니다!");
    } catch (error) {
      console.error("맵 초기화 중 오류 발생:", error);
    }
  };

  // 면적 계산 함수 (사각형)
  const calculateRectangleArea = (sw, ne) => {
    if (!sw || !ne) return;
    
    // 지구 반경 (미터)
    const earthRadius = 6371000;
    
    // 라디안으로 변환
    const lat1 = sw.getLat() * Math.PI / 180;
    const lng1 = sw.getLng() * Math.PI / 180;
    const lat2 = ne.getLat() * Math.PI / 180;
    const lng2 = ne.getLng() * Math.PI / 180;
    
    // 가로, 세로 거리 계산 (하버사인 공식)
    const dLat = lat2 - lat1;
    const dLng = lng2 - lng1;
    
    // 위도 방향 거리
    const latDistance = earthRadius * dLat;
    
    // 경도 방향 거리 (위도에 따라 다름, 평균 위도 사용)
    const avgLat = (lat1 + lat2) / 2;
    const lngDistance = earthRadius * Math.cos(avgLat) * dLng;
    
    // 면적 계산 (제곱미터)
    const calculatedArea = Math.abs(latDistance * lngDistance);
    setArea(calculatedArea);
  };

  // 모달이 처음 열릴 때 스크립트 로드
  useEffect(() => {
    if (!isOpen) return;
    
    function loadKakaoMapAsynchronously() {
      const existingScript = document.querySelector(
        'script[src*="dapi.kakao.com/v2/maps/sdk.js"]'
      );
      if (existingScript) {
        console.log("이미 카카오맵 스크립트가 존재합니다.");
        window.kakao.maps.load(() => {
          console.log("카카오맵 API 재초기화 완료!");
          setMapScriptLoaded(true);
          initializeMap(); 
        });
        return;
      }

      console.log("카카오맵 API 로드 시도...");
      const script = document.createElement("script");
      script.src = "https://dapi.kakao.com/v2/maps/sdk.js?appkey=0177e5aaa20d0847b3b223ccf30099c7&autoload=false&libraries=services,drawing";
      script.async = true;
      
      // 오류 이벤트 추가
      script.onerror = (error) => {
        console.error("카카오맵 API 로드 실패:", error);
      };
      
      script.onload = () => {
        window.kakao.maps.load(() => {
          console.log("카카오맵 API 초기화 완료!");
          setMapScriptLoaded(true);
        });
      };
      
      document.head.appendChild(script);
    }

    loadKakaoMapAsynchronously();
  }, [isOpen]);

  // 맵 초기화 및 이벤트 리스너 설정
  useEffect(() => {
    if (!isOpen || !mapContainer.current || !mapScriptLoaded || mapInitialized) return;
    // 약간의 지연을 두고 초기화 (DOM 요소가 완전히 렌더링된 후)
    const timer = setTimeout(() => {
      initializeMap();
    }, 500);
    
    return () => {
      clearTimeout(timer);
    };
  }, [isOpen, mapScriptLoaded, mapInitialized]);

  // 드로잉 모드 관리
  useEffect(() => {
    if (!isOpen || !mapInitialized || !drawingManager.current) return;
    
    if (drawingMode) {
      // 사각형 그리기 모드 활성화
      drawingManager.current.select(window.kakao.maps.drawing.OverlayType.RECTANGLE);
      console.log("사각형 그리기 모드 활성화: 드래그하여 영역을 그리세요");
      
      // 커서 스타일 변경
      if (map.current) {
        map.current.getNode().style.cursor = 'crosshair';
      }
    } else {
      // 그리기 모드 취소
      drawingManager.current.cancel();
      
      // 커서 스타일 원래대로
      if (map.current) {
        map.current.getNode().style.cursor = '';
      }
    }
  }, [drawingMode, mapInitialized]);

  // 사각형 복원 (리렌더링 후)
  useEffect(() => {
    if (!isOpen || !mapInitialized || !map.current || !rectangleBounds) return;
    
    // 사각형이 맵에 표시되어 있는지 확인하고, 없으면 다시 생성
    if (rectangle.current && !rectangle.current.getMap()) {
      const newRectangle = new window.kakao.maps.Rectangle({
        bounds: rectangleBounds,
        strokeColor: '#39DE2A',
        strokeWeight: 3,
        strokeOpacity: 0.8,
        strokeStyle: 'solid',
        fillColor: '#39DE2A',
        fillOpacity: 0.3
      });
      
      newRectangle.setMap(map.current);
      rectangle.current = newRectangle;
      
      // 면적 다시 계산
      const sw = rectangleBounds.getSouthWest();
      const ne = rectangleBounds.getNorthEast();
      calculateRectangleArea(sw, ne);
    }
  }, [isOpen, mapInitialized, rectangleBounds]);

  // 장소 검색 함수
  const searchPlaces = () => {
    if (!searchKeyword.trim()) {
      alert('검색어를 입력해주세요.');
      return;
    }

    if (!ps.current) {
      console.error("장소 서비스가 초기화되지 않았습니다.");
      alert("지도가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    ps.current.keywordSearch(searchKeyword, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        // 검색된 장소 위치를 기준으로 지도 범위 재설정
        displayPlaces(data);
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        alert('검색 결과가 존재하지 않습니다.');
      } else if (status === window.kakao.maps.services.Status.ERROR) {
        alert('검색 중 오류가 발생했습니다.');
      }
    });
  };

  // 검색 결과 표시 함수
  const displayPlaces = (places) => {
    if (places.length === 0 || !map.current) return;
    
    // 첫 번째 검색 결과로 이동
    const bounds = new window.kakao.maps.LatLngBounds();
    
    places.forEach(place => {
      // 좌표를 생성하고 bounds에 추가
      const placePosition = new window.kakao.maps.LatLng(place.y, place.x);
      bounds.extend(placePosition);
      
      // 첫 번째 결과에 인포윈도우 표시
      if (place === places[0] && infowindow.current) {
        infowindow.current.setContent(`<div style="padding:5px;font-size:12px;">${place.place_name}</div>`);
        infowindow.current.open(map.current, new window.kakao.maps.Marker({
          position: placePosition,
          map: map.current
        }));
      }
    });
    
    // 검색된 장소들의 위치를 기준으로 지도 범위 재설정
    map.current.setBounds(bounds);
    
    // 적절한 줌 레벨 설정
    if (places.length === 1) {
      map.current.setLevel(3);
    }
  };

  // 사각형 제거 함수
  const clearRectangle = () => {
    if (rectangle.current) {
      // 지도에서 사각형 제거
      rectangle.current.setMap(null);
      rectangle.current = null;
    }
    
    // 상태 초기화
    setRectangleBounds(null);
    setArea(0);
  };


  // 폼 리셋 함수
  const resetForm = () => {
    setFarmlandName('');
    setFarmlandDescription('');
    setSearchKeyword('');
    setDrawingMode(false);
    clearRectangle();
  };

  // 노지 추가 폼 제출 핸들러
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!farmlandName.trim()) {
      alert('노지 이름을 입력해주세요.');
      return;
    }
    
    if (!rectangleBounds) {
      alert('노지 영역을 지도에서 사각형으로 표시해주세요.');
      return;
    }
    
    // 사각형의 꼭지점 좌표 추출
    const sw = rectangleBounds.getSouthWest();
    const ne = rectangleBounds.getNorthEast();
    const nw = new window.kakao.maps.LatLng(ne.getLat(), sw.getLng());
    const se = new window.kakao.maps.LatLng(sw.getLat(), ne.getLng());
    
    // 좌표 배열 생성 (시계 방향)
    const polygonPath = [
      { lat: sw.getLat(), lng: sw.getLng() }, // 남서
      { lat: se.getLat(), lng: se.getLng() }, // 남동
      { lat: ne.getLat(), lng: ne.getLng() }, // 북동
      { lat: nw.getLat(), lng: nw.getLng() }  // 북서
    ];
    
    // 노지 데이터 생성
    const newFarmland = {
      id: Date.now(), // 임시 ID
      title: farmlandName,
      description: farmlandDescription,
      area: Math.round(area), // 제곱미터
      polygon: polygonPath,
      createdAt: new Date().toISOString(),
      image: '../../public/logo192.png' // 임시 이미지
    };
    
    // 부모 컴포넌트에 데이터 전달
    onAddFarmland(newFarmland);
    
    // 모달 닫기
    onClose();
  };

  // 키보드 엔터 키로 검색
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchPlaces();
    }
  };

  // 모달이 닫힌 상태면 아무것도 렌더링하지 않음
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="farmland-modal">
        <div className="modal-header">
          <h2>새 노지 추가</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-content">
          {/* 맵 영역 */}
          <div className="map-container">
            <div className="map-search-bar">
              <input 
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                placeholder="주소 또는 장소 검색..."
              />
              <button onClick={searchPlaces}>
                <FontAwesomeIcon icon={faSearch} />
              </button>
            </div>
            
            <div className="map-actions">
              <button 
                className={`drawing-mode-btn ${drawingMode ? 'active' : ''}`}
                onClick={() => setDrawingMode(!drawingMode)}
                title={drawingMode ? "그리기 중지" : "사각형 영역 그리기"}
              >
                <FontAwesomeIcon icon={faSquare} />
                {drawingMode ? "마우스로 드래그하여 사각형 그리기" : "사각형 영역 그리기"}
              </button>
              
              <button 
                className="clear-markers-btn"
                onClick={clearRectangle}
                title="사각형 지우기"
              >
                <FontAwesomeIcon icon={faTrash} />
                초기화
              </button>
            </div>
            
            <div id="map" ref={mapContainer} className="kakao-map"></div>
            
            {area > 0 && (
              <div className="area-info">
                <span>면적: 약 {Math.round(area).toLocaleString()} m² ({Math.round(area / 10000 * 100) / 100} 헥타르)</span>
              </div>
            )}
          </div>
          
          {/* 노지 정보 폼 */}
          <form className="farmland-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="farmland-name">노지 이름</label>
              <input
                id="farmland-name"
                type="text"
                value={farmlandName}
                onChange={(e) => setFarmlandName(e.target.value)}
                placeholder="노지 이름을 입력하세요"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="farmland-description">간단 설명</label>
              <textarea
                id="farmland-description"
                value={farmlandDescription}
                onChange={(e) => setFarmlandDescription(e.target.value)}
                placeholder="노지에 대한 간단한 설명을 입력하세요"
                rows="4"
              ></textarea>
            </div>
            
             <div className="form-actions">
              <button
                type="button"
                className="verify-button"
                onClick={handleVerifyBBox}
              >
                검증하기
              </button>
              <button 
                type="submit" 
                className="save-button"
                disabled={!isValidationPassed}
              >
                <FontAwesomeIcon icon={faSave} />
                저장하기
              </button>
            </div>

            {validationMessage && (
              <p className={`validation-message ${isValidationPassed ? 'success' : 'error'}`}>
                {validationMessage}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddFarmlandModal;