import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChevronRight, 
  faChevronLeft,
  faPlus,
  faSeedling
} from '@fortawesome/free-solid-svg-icons';
import '../css/Sidebar.css';

const Sidebar = ({ isOpen, toggleSidebar }) => {

  // 임시 노지 데이터
  const farmlands = [
    {
      id: 1,
      title: '논 1구역',
      description: '벼농사 주요 재배지. 면적 3,500㎡',
      image: process.env.PUBLIC_URL + '/logo192.png',
    },
    {
      id: 2,
      title: '밭작물 A구역',
      description: '콩, 감자 재배 지역. 면적 2,200㎡',
      image: process.env.PUBLIC_URL + '/logo192.png',
    },
    {
      id: 3,
      title: '비닐하우스 단지',
      description: '딸기, 토마토 재배. 6개동 운영중',
      image: process.env.PUBLIC_URL + '/logo192.png',
    },
    {
      id: 4,
      title: '과수원 지역',
      description: '사과, 배 재배. 총 120그루',
      image: process.env.PUBLIC_URL + '/logo192.png',
    },
  ];

  // 노지 추가 핸들러 (임시 함수)
  const handleAddFarmland = () => {
    alert('노지 추가 기능 구현 예정입니다.');
    // 여기에 노지 추가 모달 또는 페이지 이동 로직 구현
  };

  return (
    <div className={`sidebar-container ${isOpen ? 'open' : 'closed'}`}>
      {/* 토글 버튼 */}
      <button className="sidebar-toggle" onClick={toggleSidebar} aria-label="사이드바 전환">
        <FontAwesomeIcon icon={isOpen ? faChevronLeft : faChevronRight} />
      </button>
      
      {/* 사이드바 컨텐츠 */}
      <div className="sidebar-content">
        <div className="sidebar-header">
          <h3>
            <FontAwesomeIcon icon={faSeedling} /> 
            <span>내 농지 목록</span>
            {/* 노지 추가 버튼 */}
            <button className="add-farmland-button" onClick={handleAddFarmland}>
              <FontAwesomeIcon icon={faPlus} /> 노지 추가
            </button>
          </h3>
          
        </div>
        
        {/* 노지 목록 */}
        <div className="farmland-list">
          {farmlands.map(farmland => (
            <div key={farmland.id} className="farmland-item">
              <div className="farmland-image">
                <img src={farmland.image} alt={farmland.title} />
              </div>
              <div className="farmland-info">
                <h4 className="farmland-title">{farmland.title}</h4>
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
          ))}
        </div>
        
        
      </div>
    </div>
  );
};

export default Sidebar;