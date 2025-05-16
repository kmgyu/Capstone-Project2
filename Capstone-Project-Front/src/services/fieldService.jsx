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

const fieldService = {
    getAllFields: async () => {
    try {
      console.log('getAllFields 호출');
      const headers = await getAuthHeaders();
      const response = await api.get('/field/fields/id', { headers });
      console.log(response)
      return response.data;
    } catch (error) {
      console.error('전체 할 일 조회 오류:', error);
      throw error;
    }
  },

}

export default fieldService;