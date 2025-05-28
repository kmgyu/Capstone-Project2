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

const AddFarmlandModal = ({ 
    isOpen, 
    onClose, 
    onAddField, 
    initialData = null, 
    isEditMode = false 
  }) => {
  // 맵 관련 상태 및 참조
  const mapContainer = useRef(null);
  const map = useRef(null);
  const drawingManager = useRef(null);
  const rectangle = useRef(null);
  const polygon = useRef(null);
  
  // 폼 상태
  const [fieldName, setFieldName] = useState('');
  const [fieldAddress, setFieldAddress] = useState('');
  const [fieldArea, setFieldArea] = useState(0);
  const [cropName, setCropName] = useState('배추');
  const [description, setDescription] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [drawingMode, setDrawingMode] = useState(false);
  const [rectangleBounds, setRectangleBounds] = useState(null);
  const [mapScriptLoaded, setMapScriptLoaded] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [isValidationPassed, setIsValidationPassed] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [geometry, setGeometry] = useState(null);

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
      if (coordinates && coordinates.length > 0) {
        console.log('Geometry 좌표:', coordinates);
        
        // 좌표로 GeoJSON 객체 생성
        const geoJson = {
          type: "Polygon",
          coordinates: coordinates
        };
        console.log('결과 데이터', result)
        const field_area = result.field_area;
        const field_address = result.field_address;
        console.log(field_area, field_address);
        setGeometry(geoJson);
        setFieldArea(field_area);
        setFieldAddress(field_address);
        drawGeometryPolygon(coordinates);
        setIsValidationPassed(true);
        setValidationMessage('필지 검증이 완료되었습니다. 저장할 수 있습니다.');
        
        // 면적 정보 자동 설정
        if (fieldArea === 0) {
          const calculatedArea = calculatePolygonArea(coordinates[0][0]);
          setFieldArea(Math.round(calculatedArea));
        }
      } else {
        console.error('유효하지 않은 좌표 데이터:', coordinates);
        setIsValidationPassed(false);
        setValidationMessage('유효한 좌표를 찾을 수 없습니다.');
      }
    } else {
      setIsValidationPassed(false);
      setValidationMessage(`필지 조회 실패: ${result.error}`);
    }
  };

  // 폴리곤 면적 계산 함수
  const calculatePolygonArea = (coordinates) => {
    if (!coordinates || coordinates.length < 3) return 0;
    
    // 지구 반경 (미터)
    const earthRadius = 6371000;
    
    let totalArea = 0;
    
    // 폴리곤 면적 계산 (구형 면적 계산)
    for (let i = 0; i < coordinates.length - 1; i++) {
      const p1 = {
        lng: coordinates[i][0] * Math.PI / 180,
        lat: coordinates[i][1] * Math.PI / 180
      };
      const p2 = {
        lng: coordinates[i + 1][0] * Math.PI / 180,
        lat: coordinates[i + 1][1] * Math.PI / 180
      };
      
      // 두 점 사이의 각도
      const angle = Math.acos(
        Math.sin(p1.lat) * Math.sin(p2.lat) +
        Math.cos(p1.lat) * Math.cos(p2.lat) * Math.cos(p1.lng - p2.lng)
      );
      
      totalArea += angle * earthRadius * earthRadius;
    }
    
    // 면적 반환 (제곱미터)
    return Math.abs(totalArea);
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
    
    if (polygon.current) {
      polygon.current.setMap(null);
      polygon.current = null;
    }

    const path = coordinatesArray.map(coord => 
      new window.kakao.maps.LatLng(coord[1], coord[0])
    );

    const newPolygon = new window.kakao.maps.Polygon({
      path: path,
      strokeWeight: 3,
      strokeColor: '#FF0000',
      strokeOpacity: 0.8,
      strokeStyle: 'solid',
      fillColor: '#FF0000',
      fillOpacity: 0.3
    });

    newPolygon.setMap(map.current);

    // 지도 중심 이동
    const bounds = new window.kakao.maps.LatLngBounds();
    path.forEach(point => bounds.extend(point));
    map.current.setBounds(bounds);

    // 상태 저장
    polygon.current = newPolygon;
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
        
        // 검증 상태 초기화
        setIsValidationPassed(false);
        setValidationMessage('');
        setGeometry(null);
      });
      
      // 오버레이가 삭제될 때 이벤트 처리
      window.kakao.maps.event.addListener(drawingManager.current, 'remove', function(data) {
        // 사각형 상태 초기화
        setRectangleBounds(null);
        rectangle.current = null;
        setFieldArea(0);
        setIsValidationPassed(false);
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
    setFieldArea(Math.round(calculatedArea));
  };

  useEffect(() => {
    if (isEditMode && initialData) {
      setFieldName(initialData.field_name || '');
      setFieldAddress(initialData.field_address || '');
      setFieldArea(initialData.field_area || 0);
      setCropName(initialData.crop_name || '배추');
      setDescription(initialData.description || '');
      setGeometry(initialData.geometry || null);
      
      // 기존 geometry가 있으면 지도에 표시
      if (initialData.geometry) {
        setIsValidationPassed(true);
        setValidationMessage('기존 필지 정보를 불러왔습니다.');
      }
    } else {
      // 추가 모드일 때는 폼 초기화
      resetForm();
    }
  }, [isEditMode, initialData, isOpen]);

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
        
        // 첫 번째 검색 결과의 주소를 입력란에 설정
        setFieldAddress(place.address_name || place.road_address_name || "");
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
    
    if (polygon.current) {
      polygon.current.setMap(null);
      polygon.current = null;
    }
    
    // 상태 초기화
    setRectangleBounds(null);
    setFieldArea(0);
    setIsValidationPassed(false);
    setValidationMessage('');
    setGeometry(null);
  };

  // 폼 리셋 함수
  const resetForm = () => {
    setFieldName('');
    setFieldAddress('');
    setCropName('');
    setDescription('');
    setSearchKeyword('');
    setDrawingMode(false);
    clearRectangle();
  };

  // 노지 추가 폼 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!fieldName.trim()) {
      alert('노지 이름을 입력해주세요.');
      return;
    }
    
    if (!isValidationPassed || !geometry) {
      alert('노지 검증을 먼저 완료해주세요.');
      return;
    }
    
    // 노지 데이터 생성
    const fieldData = {
      field_name: fieldName,
      field_address: fieldAddress,
      field_area: fieldArea,
      crop_name: cropName,
      description: description,
      geometry: geometry
    };
    
    try {
      // 노지 생성 API 호출
      const result = await farmlandService.createField(fieldData);
      
      if (result.success) {
        alert('노지가 성공적으로 등록되었습니다.');
        
        // 부모 컴포넌트에 데이터 전달
        onAddField(result.data);
        
        // 모달 닫기
        onClose();
      } else {
        alert(`노지 등록에 실패했습니다: ${result.error}`);
      }
    } catch (error) {
      console.error('노지 등록 중 오류 발생:', error);
      alert('노지 등록 중 오류가 발생했습니다.');
    }
  };

  // 키보드 엔터 키로 검색
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchPlaces();
    }
  };
  // geometry가 설정되면 지도에 폴리곤을 그려줌
  useEffect(() => {
    console.log('감지되었음')
    console.log(geometry)
    if (!isOpen || !mapInitialized || !geometry) return;
    if (geometry.coordinates) {
      console.log('그립니다다')
      drawGeometryPolygon(geometry.coordinates);
    }
  }, [geometry, isOpen, mapInitialized]);

  // 모달이 닫힌 상태면 아무것도 렌더링하지 않음
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="farmland-modal">
        <div className="modal-header">
          <h2>{isEditMode ? '노지 수정' : '새 노지 추가'}</h2>
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
            
            {fieldArea > 0 && (
              <div className="area-info">
                <span>면적: 약 {fieldArea.toLocaleString()} m² ({(fieldArea / 10000).toFixed(2)} 헥타르)</span>
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
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="노지 이름을 입력하세요"
                required
              />
            </div>
          
            <div className="form-group">
              <label htmlFor="farmland-description">간단 설명</label>
              <textarea
                id="farmland-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="노지에 대한 간단한 설명을 입력하세요"
                rows="3"
              ></textarea>
            </div>
            
            <div className="form-actions">
              <button
                type="button"
                className="verify-button"
                onClick={handleVerifyBBox}
                disabled={!rectangleBounds}
              >
                필지 검증
              </button>
              <button type="submit" className="save-button" disabled={!isValidationPassed}>
                <FontAwesomeIcon icon={faSave} />
                {isEditMode ? '수정하기' : '저장하기'}
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