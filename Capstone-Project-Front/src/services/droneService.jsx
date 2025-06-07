// src/services/droneService.js

import axios from 'axios';
import authService from './authService';

// 도메인 맞게 수정하세요
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://orion.mokpo.ac.kr:8483/drone';

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

const droneService = {


  // (2) 드론 소유권 주장
  claimDrone: async (serial_number, name) => {
    try {
      const headers = await getAuthHeaders();
      const response = await api.post('/claim-drone/', { serial_number, name }, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // (3) 나의 드론 목록 조회
  getMyDrones: async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await api.get('/my-drones/', { headers });
      console.log('겟',response.data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // (4) 드론 정보 수정
  updateDroneName: async (drone_id, name) => {
    try {
      const headers = await getAuthHeaders();
      const response = await api.put(`/${drone_id}/`, { name }, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // (5) 드론 삭제
  deleteDrone: async (drone_id) => {
    try {
      const headers = await getAuthHeaders();
      const response = await api.delete(`/delete/${drone_id}/`, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // (6) 로그 업로드 (인증 필요 없음)
  uploadFlightLog: async (logData) => {
    try {
      // 인증 없이 POST
      const response = await api.post('/log/upload/', logData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // (7) 로그 단일 조회 (battery/altitude/gps-strength/flight-mode)
  getLogBattery: async (drone_id) => {
    try {
      const headers = await getAuthHeaders();
      const response = await api.get(`/log/battery/?drone_id=${drone_id}`, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  getLogAltitude: async (drone_id) => {
    try {
      const headers = await getAuthHeaders();
      const response = await api.get(`/log/altitude/?drone_id=${drone_id}`, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  getLogGpsStrength: async (drone_id) => {
    try {
      const headers = await getAuthHeaders();
      const response = await api.get(`/log/gps-strength/?drone_id=${drone_id}`, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  getLogFlightMode: async (drone_id) => {
    try {
      const headers = await getAuthHeaders();
      const response = await api.get(`/log/flight-mode/?drone_id=${drone_id}`, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // (8) 위치 로그 전체 조회
  getLogLocationHistory: async (drone_id) => {
    try {
      const headers = await getAuthHeaders();
      const response = await api.get(`/log/location/?drone_id=${drone_id}`, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // (9) 일일 비행 시간 조회
  getDailyFlightTime: async (drone_id) => {
    try {
      const headers = await getAuthHeaders();
      const response = await api.get(`/log/daily-flight-time/?drone_id=${drone_id}`, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // (10) 에러 로그
  getErrorLogs: async (drone_id) => {
    try {
      const headers = await getAuthHeaders();
      const response = await api.get(`/log/error-log/?drone_id=${drone_id}`, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  postErrorLog: async (logData) => {
    try {
      const headers = await getAuthHeaders();
      const response = await api.post('/log/error-log/', logData, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // (11) 현재 비행상태 조회
  getFlightStatus: async (drone_id) => {
    try {
      const headers = await getAuthHeaders();
      const response = await api.get(`/log/flight-status/?drone_id=${drone_id}`, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default droneService;
