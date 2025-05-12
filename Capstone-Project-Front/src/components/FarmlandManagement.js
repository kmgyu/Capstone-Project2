import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, 
  faFilter, 
  faPlus, 
  faSeedling,
  faEllipsisV,
  faSort
} from '@fortawesome/free-solid-svg-icons';
import '../css/FarmlandManagement.css';
import AddFarmlandModal from './AddFarmlandModal';

const FarmlandManagement = () => {
  // 정렬 상태 관리
  const [sortOption, setSortOption] = useState('newest');
  const [showSortOptions, setShowSortOptions] = useState(false);
  
  // 검색어 상태 관리
  const [searchQuery, setSearchQuery] = useState('');
  
  // 필터 상태 관리 제거
  
  // 노지 추가 모달 상태
  const [showAddModal, setShowAddModal] = useState(false);

  // 샘플 노지 데이터
  const [farmlands, setFarmlands] = useState([
    {
      id: 1,
      title: '논 1구역',
      description: '벼농사 주요 재배지. 면적 3,500㎡, 2025년 4월 파종 예정',
      image: process.env.PUBLIC_URL + '/logo192.png',
      type: 'rice',
      createdAt: '2025-01-15'
    },
    {
      id: 2,
      title: '밭작물 A구역',
      description: '콩, 감자 재배 지역. 면적 2,200㎡, 현재 감자 재배중',
      image: process.env.PUBLIC_URL + '/logo192.png',
      type: 'field',
      createdAt: '2025-02-20'
    },
    {
      id: 3,
      title: '비닐하우스 단지',
      description: '딸기, 토마토 재배. 6개동 운영중, 스마트팜 시스템 적용',
      image: process.env.PUBLIC_URL + '/logo192.png',
      type: 'greenhouse',
      createdAt: '2025-03-05'
    },
    {
      id: 4,
      title: '과수원 지역',
      description: '사과, 배 재배. 총 120그루, 5년생 사과나무 중심 재배',
      image: process.env.PUBLIC_URL + '/logo192.png',
      type: 'orchard',
      createdAt: '2025-01-30'
    },
    {
      id: 5,
      title: '특용작물 구역',
      description: '인삼, 약초 재배. 그늘막 설치, 2년차 인삼 재배중',
      image: process.env.PUBLIC_URL + '/logo192.png',
      type: 'special',
      createdAt: '2025-03-15'
    },
    {
      id: 6,
      title: '시험 재배지',
      description: '새로운 품종 테스트. 면적 500㎡, 유기농법 적용중',
      image: process.env.PUBLIC_URL + '/logo192.png',
      type: 'experimental',
      createdAt: '2025-04-01'
    }
  ]);

  // 정렬 함수
  const sortFarmlands = (lands) => {
    switch(sortOption) {
      case 'newest':
        return [...lands].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return [...lands].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'name_asc':
        return [...lands].sort((a, b) => a.title.localeCompare(b.title));
      case 'name_desc':
        return [...lands].sort((a, b) => b.title.localeCompare(a.title));
      default:
        return lands;
    }
  };

  // 필터링 함수 - 검색어만 사용
  const filterFarmlands = (lands) => {
    // 검색어로만 필터링
    if (searchQuery) {
      return lands.filter(land => 
        land.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        land.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return lands;
  };

  // 최종 표시할 노지 데이터
  const displayFarmlands = sortFarmlands(filterFarmlands(farmlands));

  // 노지 타입에 따른 색상 및 텍스트 반환
  const getFarmlandTypeInfo = (type) => {
    switch(type) {
      case 'rice':
        return { color: '#4CAF50', text: '논' };
      case 'field':
        return { color: '#FF9800', text: '밭' };
      case 'greenhouse':
        return { color: '#2196F3', text: '비닐하우스' };
      case 'orchard':
        return { color: '#9C27B0', text: '과수원' };
      case 'special':
        return { color: '#F44336', text: '특용작물' };
      case 'experimental':
        return { color: '#607D8B', text: '시험재배' };
      default:
        return { color: '#757575', text: '기타' };
    }
  };

  // 노지 추가 핸들러
  const handleAddFarmland = () => {
    setShowAddModal(true);
  };
  
  // 새 노지 추가 처리 함수
  const handleSaveFarmland = (newFarmland) => {
    // 기존 노지 데이터에 새 노지 추가
    setFarmlands([newFarmland, ...farmlands]);
  };

  // 노지 클릭 핸들러 (임시)
  const handleFarmlandClick = (id) => {
    alert(`노지 ${id} 상세 페이지로 이동 예정`);
  };

  return (
    <div className="farmland-management">
      <div className="farmland-header">
        <h1 className="page-title">
          <FontAwesomeIcon icon={faSeedling} className="title-icon" />
          농지 관리
        </h1>
        
        <div className="farmland-controls">
          {/* 검색 영역 */}
          <div className="search-bar">
            <FontAwesomeIcon icon={faSearch} className="search-icon" />
            <input 
              type="text" 
              placeholder="농지 검색..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* 정렬 영역 */}
          <div className="sort-container">
            <button 
              className="sort-button"
              onClick={() => setShowSortOptions(!showSortOptions)}
            >
              <FontAwesomeIcon icon={faSort} />
              <span>
                {sortOption === 'newest' && '최신순'}
                {sortOption === 'oldest' && '오래된순'}
                {sortOption === 'name_asc' && '이름(오름차순)'}
                {sortOption === 'name_desc' && '이름(내림차순)'}
              </span>
            </button>
            
            {showSortOptions && (
              <div className="sort-dropdown">
                <div 
                  className={`sort-option ${sortOption === 'newest' ? 'active' : ''}`}
                  onClick={() => {
                    setSortOption('newest');
                    setShowSortOptions(false);
                  }}
                >
                  최신순
                </div>
                <div 
                  className={`sort-option ${sortOption === 'oldest' ? 'active' : ''}`}
                  onClick={() => {
                    setSortOption('oldest');
                    setShowSortOptions(false);
                  }}
                >
                  오래된순
                </div>
                <div 
                  className={`sort-option ${sortOption === 'name_asc' ? 'active' : ''}`}
                  onClick={() => {
                    setSortOption('name_asc');
                    setShowSortOptions(false);
                  }}
                >
                  이름 (오름차순)
                </div>
                <div 
                  className={`sort-option ${sortOption === 'name_desc' ? 'active' : ''}`}
                  onClick={() => {
                    setSortOption('name_desc');
                    setShowSortOptions(false);
                  }}
                >
                  이름 (내림차순)
                </div>
              </div>
            )}
          </div>
          
          {/* 농지 추가 버튼 */}
          <button className="farmland-add-button" onClick={handleAddFarmland}>
            <FontAwesomeIcon icon={faPlus} />
            <span>농지 추가</span>
          </button>
        </div>
      </div>

      {/* 노지 그리드 */}
      <div className="farmland-grid">
        {displayFarmlands.length > 0 ? (
          displayFarmlands.map(farmland => (
            <div 
              key={farmland.id} 
              className="farmland-card"
              onClick={() => handleFarmlandClick(farmland.id)}
            >
              <div className="farmland-image">
                <img src={farmland.image} alt={farmland.title} />
              </div>
              <div className="farmland-content">
                <h3 className="farmland-title">{farmland.title}</h3>
                <p className="farmland-description">{farmland.description}</p>
                <div className="farmland-actions">
                  <button className="action-button edit">
                    <span>편집</span>
                  </button>
                  <button className="action-button delete">
                    <span>삭제</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-results">
            <p>검색 결과가 없습니다.</p>
            <p className="sub-text">다른 검색어나 필터를 시도해보세요.</p>
          </div>
        )}
      </div>
      
      {/* 노지 추가 모달 */}
      <AddFarmlandModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddFarmland={handleSaveFarmland}
      />
    </div>
  );
};

export default FarmlandManagement;