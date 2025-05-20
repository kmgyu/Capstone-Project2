import axios from 'axios';
import authService from './authService';

// API 기본 URL 설정
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://orion.mokpo.ac.kr:8483';

// Axios 인스턴스
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

/**
 * 인증 토큰을 검증 및 갱신하고, 요청 헤더를 반환합니다.
 */
async function getAuthHeaders() {
  let token = authService.getAccessToken();
  if (!token) return {};

  // 토큰 검증
  const verification = await authService.verifyToken();
  if (!verification.valid) {
    const refreshResult = await authService.refreshAccessToken();
    if (refreshResult.success) {
      token = refreshResult.access;
    } else {
      authService.clearTokens();
      throw new Error('유효한 토큰이 없습니다.');
    }
  }

  return { Authorization: `Bearer ${token}` };
}

/**
 * 모든 노지 조회
 * @returns {Promise<object>} 노지 목록 또는 오류 정보
 */
const getAllFields = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await api.get('/field/fields/', { headers });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('노지 목록 조회 실패:', error.response || error);
    return { success: false, error: error.response?.data?.detail || '요청 실패' };
  }
};

/**
 * 새 노지 생성
 * @param {object} fieldData - 노지 데이터
 * @param {string} fieldData.field_name - 노지 이름
 * @param {string} fieldData.field_address - 노지 주소
 * @param {number} fieldData.field_area - 노지 면적(㎡)
 * @param {string} fieldData.crop_name - 재배 작물명
 * @param {string} fieldData.description - 설명
 * @param {object} fieldData.geometry - GeoJSON 형식의 다각형 데이터
 * @returns {Promise<object>} 생성된 노지 정보 또는 오류 정보
 */
const createField = async (fieldData) => {
  try {
    const headers = await getAuthHeaders();
    console.log('fieldData:', fieldData);
    const response = await api.post('/field/fields/', fieldData, { headers });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('노지 생성 실패:', error.response || error);
    return { success: false, error: error.response?.data?.detail || '요청 실패' };
  }
};

/**
 * 특정 노지 조회
 * @param {number} fieldId - 노지 ID
 * @returns {Promise<object>} 노지 정보 또는 오류 정보
 */
const getFieldById = async (fieldId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await api.get(`/field/fields/${fieldId}/`, { headers });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('노지 조회 실패:', error.response || error);
    return { success: false, error: error.response?.data?.detail || '요청 실패' };
  }
};

/**
 * 특정 노지 수정
 * @param {number} fieldId - 노지 ID
 * @param {object} fieldData - 수정할 노지 데이터 (부분 업데이트 가능)
 * @returns {Promise<object>} 수정된 노지 정보 또는 오류 정보
 */
const updateField = async (fieldId, fieldData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await api.put(`/field/fields/${fieldId}/`, fieldData, { headers });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('노지 수정 실패:', error.response || error);
    return { success: false, error: error.response?.data?.detail || '요청 실패' };
  }
};

/**
 * 특정 노지 삭제
 * @param {number} fieldId - 노지 ID
 * @returns {Promise<object>} 성공 여부 또는 오류 정보
 */
const deleteField = async (fieldId) => {
  try {
    const headers = await getAuthHeaders();
    await api.delete(`/field/fields/${fieldId}/`, { headers });
    return { success: true };
  } catch (error) {
    console.error('노지 삭제 실패:', error.response || error);
    return { success: false, error: error.response?.data?.detail || '요청 실패' };
  }
};

/**
 * bbox 좌표를 보내어 필지 Geometry를 조회합니다.
 * @param {string} bbox - ymin,xmin,ymax,xmax,EPSG:4326 형식의 좌표 문자열
 * @returns {Promise<object>} geometry 데이터 또는 오류 정보
 */
const getGeometryByBBox = async (bbox) => {
  try {
    const headers = await getAuthHeaders();
    const response = await api.post('/field/get-geometry/', { bbox }, { headers });
    return { success: true, data: response.data.geometry, field_area: response.data.field_area, field_address: response.data.field_address };
  } catch (error) {
    console.error('Geometry 조회 실패:', error.response || error);
    return { success: false, error: error.response?.data?.detail || '요청 실패' };
  }
};

const farmlandService = {
  getAllFields,
  createField,
  getFieldById,
  updateField,
  deleteField,
  getGeometryByBBox
};

export default farmlandService;