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
 * @param {string} fieldData.description - 설명
 * @param {string} fieldData.field_url - 노지 URL (선택적)
 * @param {object} fieldData.geometry - GeoJSON 형식의 다각형 데이터
 * @note crop_name은 자동으로 '배추'로 설정됩니다.
 * @returns {Promise<object>} 생성된 노지 정보 또는 오류 정보
 */
const createField = async (fieldData) => {
  try {
    console.log('createField 호출됨, 입력 데이터:', fieldData);
    
    const headers = await getAuthHeaders();
    console.log('인증 헤더:', headers);
    
    // crop_name을 '배추'로 고정
    const fieldDataWithCrop = {
      ...fieldData,
      crop_name: '배추'
    };
    
    // 필수 필드 검증 (crop_name 제외)
    const requiredFields = ['field_name', 'field_address', 'field_area', 'description', 'geometry'];
    const missingFields = requiredFields.filter(field => !fieldDataWithCrop[field]);
    
    if (missingFields.length > 0) {
      console.error('필수 필드 누락:', missingFields);
      return { 
        success: false, 
        error: `필수 필드가 누락되었습니다: ${missingFields.join(', ')}` 
      };
    }

    // geometry 검증
    if (!fieldDataWithCrop.geometry || fieldDataWithCrop.geometry.type !== 'Polygon' || !fieldDataWithCrop.geometry.coordinates) {
      console.error('잘못된 geometry 형식:', fieldDataWithCrop.geometry);
      return { 
        success: false, 
        error: 'geometry는 유효한 Polygon 형식이어야 합니다.' 
      };
    }

    console.log('API 요청 전송 중:', fieldDataWithCrop);
    
    // API 요청
    const response = await api.post('/field/fields/', fieldDataWithCrop, { headers });
    
    console.log('API 응답 성공:', response.data);
    return { success: true, data: response.data };
    
  } catch (error) {
    console.error('노지 생성 실패 - 전체 에러:', error);
    console.error('노지 생성 실패 - 응답 에러:', error.response);
    
    // 더 자세한 에러 정보 제공
    let errorMessage = '요청 실패';
    
    if (error.response?.data) {
      console.log('서버 에러 응답:', error.response.data);
      
      if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      } else if (error.response.data.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error;
      } else {
        // 필드별 에러 메시지 조합
        const fieldErrors = [];
        Object.keys(error.response.data).forEach(field => {
          if (Array.isArray(error.response.data[field])) {
            fieldErrors.push(`${field}: ${error.response.data[field].join(', ')}`);
          } else {
            fieldErrors.push(`${field}: ${error.response.data[field]}`);
          }
        });
        if (fieldErrors.length > 0) {
          errorMessage = fieldErrors.join('; ');
        }
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    console.error('최종 에러 메시지:', errorMessage);
    return { success: false, error: errorMessage };
  }
};

/**
 * 특정 노지 조회
 * @param {number} fieldId - 노지 ID
 * @returns {Promise<object>} 성공 여부 또는 오류 정보
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
 * @param {object} fieldData - 수정할 노지 데이터
 * @returns {Promise<object>} 성공 여부 또는 오류 정보
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
    return { 
      success: true, 
      data: response.data.geometry, 
      field_area: response.data.field_area, 
      field_address: response.data.field_address 
    };
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