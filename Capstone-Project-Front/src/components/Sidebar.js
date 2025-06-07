import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChevronRight, 
  faChevronLeft,
  faPlus,
  faSeedling
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom'; // ✅ 추가!
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

  const navigate = useNavigate(); // ✅ 네비게이트 훅 사용

  // 노지 불러오기
  const fetchFarmlands = async () => {
    setLoading(true);
    setError(null);
    const result = await farmlandService.getAllFields();
    if (result.success) {
      setFarmlands(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFarmlands();
  }, []);

  const handleAddFarmland = () => {
    setShowAddModal(true);
  };

  const handleSaveFarmland = async (newFieldData) => {
    const result = await farmlandService.createField(newFieldData);
    if (result.success) {
      setShowAddModal(false);
      fetchFarmlands();
    } else {
      alert('노지 추가 실패: ' + result.error);
    }
  };

  const handleDeleteFarmland = async (field_id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    const result = await farmlandService.deleteField(field_id);
    if (result.success) {
      setFarmlands(farmlands => farmlands.filter(f => f.field_id !== field_id));
    } else {
      alert('삭제 실패: ' + result.error);
    }
  };

  const handleEditFarmland = async (farmland) => {
    try {
      const result = await farmlandService.getFieldById(farmland.field_id);
      if (result.success) {
        setEditingFarmland(result.data);
        setShowEditModal(true);
      } else {
        alert('노지 정보 조회 실패: ' + result.error);
      }
    } catch (error) {
      console.error('노지 정보 조회 중 오류:', error);
      alert('노지 정보를 불러오는 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateFarmland = async (updatedFieldData) => {
    const result = await farmlandService.updateField(editingFarmland.field_id, updatedFieldData);
    if (result.success) {
      setShowEditModal(false);
      setEditingFarmland(null);
      fetchFarmlands();
    } else {
      alert('노지 수정 실패: ' + result.error);
    }
  };

  // ⭐️ [추가] 카드 클릭 시 상세 페이지 이동, 버튼 클릭은 예외 처리
  const handleCardClick = (e, field_id) => {
    if (e.target.closest('.action-button')) return;
    if (isOpen) toggleSidebar(); // 사이드바 닫기
    navigate(`/farmland/${field_id}`);
  };

  return (
    <div className={`sidebar-container ${isOpen ? 'open' : 'closed'}`}>
      <button className="sidebar-toggle" onClick={toggleSidebar} aria-label="사이드바 전환">
        <FontAwesomeIcon icon={isOpen ? faChevronLeft : faChevronRight} />
      </button>
      <div className="sidebar-content">
        <div className="sidebar-header">
          <h3>
            <FontAwesomeIcon icon={faSeedling} /> 
            <span>내 농지 목록</span>
            <button className="add-farmland-button" onClick={handleAddFarmland}>
              <FontAwesomeIcon icon={faPlus} /> 노지 추가
            </button>
          </h3>
        </div>
        {loading && <div className="loading-message">불러오는 중...</div>}
        {error && <div className="error-message">{error}</div>}
        <div className="farmland-list">
          {farmlands.length > 0 ? (
            farmlands.map((farmland, idx) => (
              <div
                key={farmland.field_id}
                className="farmland-item"
                onClick={e => handleCardClick(e, farmland.field_id)} // ⭐️ 여기!
                style={{ cursor: 'pointer' }}
              >
                <div className="farmland-image">
                  <img 
                    src={process.env.PUBLIC_URL + `/exam_${(idx % 3) + 1}.jpg`}
                    alt={farmland.field_name} 
                  />
                </div>
                <div className="farmland-info">
                  <h4 className="farmland-title">{farmland.field_name}</h4>
                  <p className="farmland-description">{farmland.description}</p>
                  <div className="farmland-actions">
                    {/* <button 
                      className="action-button edit"
                      onClick={() => handleEditFarmland(farmland)}
                    >
                      <span>편집</span>
                    </button> */}
                    <button 
                      className="action-button delete"
                      onClick={e => {
                        e.stopPropagation(); // ⭐️ 상세 페이지 이동 막기!
                        handleDeleteFarmland(farmland.field_id);
                      }}
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
