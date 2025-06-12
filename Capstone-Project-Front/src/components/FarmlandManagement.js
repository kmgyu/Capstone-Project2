import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faPlus, faSeedling, faSort } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import '../css/FarmlandManagement.css';
import AddFarmlandModal from './AddFarmlandModal';
import farmlandService from '../services/farmlandService';

const FarmlandManagement = () => {
  const [farmlands, setFarmlands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [sortOption, setSortOption] = useState('newest');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFarmland, setEditingFarmland] = useState(null);

  const navigate = useNavigate();

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

  // 정렬/검색은 동일하게 (필드명만 맞춤)
  const sortFarmlands = (lands) => {
    switch (sortOption) {
      case 'newest':
        return [...lands].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      case 'name_asc':
        return [...lands].sort((a, b) => a.field_name.localeCompare(b.field_name));
      case 'name_desc':
        return [...lands].sort((a, b) => b.field_name.localeCompare(a.field_name));
      default:
        return lands;
    }
  };

  const filterFarmlands = (lands) => {
    if (searchQuery) {
      return lands.filter(land =>
        (land.field_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (land.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return lands;
  };

  const displayFarmlands = sortFarmlands(filterFarmlands(farmlands));

  // 노지 추가
  const handleSaveFarmland = async () => {
    setShowAddModal(false);
    fetchFarmlands(); // 여기서는 createField 호출 X
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

  // 카드 클릭시 상세 페이지 이동 (버튼 클릭은 제외)
  const handleCardClick = (e, field_id) => {
    // 버튼을 누른 경우(편집/삭제)에는 이동 방지
    if (
      e.target.closest('.action-button') // 버튼 내부 클릭시
    ) {
      return;
    }
    console.log('카드 클릭:', field_id);
    navigate(`/farmland/${field_id}`);
  };

  return (
    <div className="farmland-management">
      <div className="farmland-header">
        <h1 className="page-title">
          <FontAwesomeIcon icon={faSeedling} className="title-icon" />
          농지 관리
        </h1>
        <div className="farmland-controls">
          <div className="search-bar">
            <FontAwesomeIcon icon={faSearch} className="search-icon" />
            <input
              type="text"
              placeholder="농지 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="sort-container">
            <button
              className="sort-button"
              onClick={() => setShowSortOptions(!showSortOptions)}
            >
              <FontAwesomeIcon icon={faSort} />
              <span>
                {sortOption === 'newest' && '최신순'}
                {sortOption === 'name_asc' && '이름(오름차순)'}
                {sortOption === 'name_desc' && '이름(내림차순)'}
              </span>
            </button>
            {showSortOptions && (
              <div className="sort-dropdown">
                {['newest', 'name_asc', 'name_desc'].map(opt => (
                  <div
                    key={opt}
                    className={`sort-option ${sortOption === opt ? 'active' : ''}`}
                    onClick={() => {
                      setSortOption(opt);
                      setShowSortOptions(false);
                    }}
                  >
                    {opt === 'newest' && '최신순'}
                    {opt === 'name_asc' && '이름 (오름차순)'}
                    {opt === 'name_desc' && '이름 (내림차순)'}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="farmland-add-button" onClick={() => setShowAddModal(true)}>
            <FontAwesomeIcon icon={faPlus} />
            <span>농지 추가</span>
          </button>
        </div>
      </div>

      {/* 로딩/에러 */}
      {loading && <div>불러오는 중...</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="farmland-grid">
        {displayFarmlands.length > 0 ? (
          displayFarmlands.map((farmland, idx) => (
            <div
              key={farmland.field_id}
              className="farmland-card"
              onClick={e => handleCardClick(e, farmland.field_id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="farmland-image">
                <img
                  src={process.env.PUBLIC_URL + `/exam_${(idx % 3) + 1}.jpg`} // 1,2,3 반복
                  alt={farmland.field_name}
                />
              </div>
              <div className="farmland-content">
                <h3 className="farmland-title">{farmland.field_name}</h3>
                <p className="farmland-description">{farmland.description}</p>
                <div className="farmland-actions">
                  {/* 편집 */}
                  <button
                    className="action-button edit"
                    onClick={e => {
                      e.stopPropagation();
                      handleEditFarmland(farmland);
                    }}
                  >
                    <span>편집</span>
                  </button>
                  {/* 삭제 */}
                  <button
                    className="action-button delete"
                    onClick={e => {
                      e.stopPropagation();
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
            <div className="no-results">
              <p>검색 결과가 없습니다.</p>
              <p className="sub-text">다른 검색어나 필터를 시도해보세요.</p>
            </div>
          )
        )}
      </div>


      <AddFarmlandModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddField={handleSaveFarmland}
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

export default FarmlandManagement;
