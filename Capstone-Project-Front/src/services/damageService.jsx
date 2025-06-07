import axios from 'axios';
import authService from './authService';

// 도메인 맞게 수정하세요
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://orion.mokpo.ac.kr:8483/damage';

// Axios 인스턴스
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// 인증 헤더 반환
async function getAuthHeaders() {
  let token = authService.getAccessToken();
  if (!token) return {};

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

const damageService = {

  damagemanage: async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await api.get('/damagemanage/', { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

};

export default damageService;
