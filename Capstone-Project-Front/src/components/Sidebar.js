import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChevronRight, 
  faChevronLeft,
  faPlus,
  faSeedling
} from '@fortawesome/free-solid-svg-icons';
import '../css/Sidebar.css';
import AddFarmlandModal from './AddFarmlandModal';
import farmlandService from '../services/farmlandService';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const [farmlands, setFarmlands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFarmland, setEditingFarmland] = useState(null);

  // 노지 불러오기
  const fetchFarmlands = async () => {
    setLoading(true);
    setError(null);
    const result = await farmlandService.getAllFields();
    if (result.success) {
      console.log(result.data);
      setFarmlands(result.data); // API 응답 데이터 사용
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFarmlands();
  }, []);

  // 노지 추가 핸들러
  const handleAddFarmland = () => {
    setShowAddModal(true);
  };

  // 노지 추가 저장
  const handleSaveFarmland = async (newFieldData) => {
    const result = await farmlandService.createField(newFieldData);
    if (result.success) {
      setShowAddModal(false);
      fetchFarmlands(); // 새로고침
    } else {
      alert('노지 추가 실패: ' + result.error);
    }
  };

  // 삭제
  const handleDeleteFarmland = async (field_id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    const result = await farmlandService.deleteField(field_id);
    if (result.success) {
      setFarmlands(farmlands => farmlands.filter(f => f.field_id !== field_id));
    } else {
      alert('삭제 실패: ' + result.error);
    }
  };

  // 편집 핸들러
  const handleEditFarmland = async (farmland) => {
    try {
      // GET 요청으로 상세 정보 불러오기
      const result = await farmlandService.getFieldById(farmland.field_id);
      
      if (result.success) {
        setEditingFarmland(result.data); // 상세 데이터 설정
        setShowEditModal(true);
      } else {
        alert('노지 정보 조회 실패: ' + result.error);
      }
    } catch (error) {
      console.error('노지 정보 조회 중 오류:', error);
      alert('노지 정보를 불러오는 중 오류가 발생했습니다.');
    }
  };

  // 노지 수정 저장
  const handleUpdateFarmland = async (updatedFieldData) => {
    const result = await farmlandService.updateField(editingFarmland.field_id, updatedFieldData);
    if (result.success) {
      setShowEditModal(false);
      setEditingFarmland(null);
      fetchFarmlands(); // 새로고침
    } else {
      alert('노지 수정 실패: ' + result.error);
    }
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
        
        {/* 로딩/에러 표시 */}
        {loading && <div className="loading-message">불러오는 중...</div>}
        {error && <div className="error-message">{error}</div>}
        
        {/* 노지 목록 */}
        <div className="farmland-list">
          {farmlands.length > 0 ? (
            farmlands.map(farmland => (
              <div key={farmland.field_id} className="farmland-item">
                <div className="farmland-image">
                  <img 
                    src={farmland.image_url ? farmland.image_url : process.env.PUBLIC_URL + '/logo192.png'} 
                    alt={farmland.field_name} 
                  />
                </div>
                <div className="farmland-info">
                  <h4 className="farmland-title">{farmland.field_name}</h4>
                  <p className="farmland-description">{farmland.description}</p>
                  <div className="farmland-actions">
                    <button 
                      className="action-button edit"
                      onClick={() => handleEditFarmland(farmland)}
                    >
                      <span>편집</span>
                    </button>
                    <button 
                      className="action-button delete"
                      onClick={() => handleDeleteFarmland(farmland.field_id)}
                    >
                      <span>삭제</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            !loading && (
              <div className="no-farmlands">
                <p>등록된 농지가 없습니다.</p>
                <p className="sub-text">농지를 추가해보세요.</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* 농지 추가 모달 */}
      <AddFarmlandModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddFarmland={handleSaveFarmland}
      />

      {/* 농지 편집 모달 */}
      <AddFarmlandModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingFarmland(null);
        }}
        onAddField={handleUpdateFarmland}
        initialData={editingFarmland}
        isEditMode={true}
      />
    </div>
  );
};

export default Sidebar;