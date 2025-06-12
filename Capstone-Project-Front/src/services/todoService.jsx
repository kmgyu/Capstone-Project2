// src/services/todoService.js
import axios from 'axios';
import moment from 'moment';
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

const todoService = {
  /**
   * 사용자 노지 전체 할 일 조회 (기간 필터도 가능)
   */
  getAllTodos: async (start, end) => {
    try {
      const headers = await getAuthHeaders();
      const params = {};
      if (start) params.start = start;
      if (end) params.end = end;
      console.log('전체 할 일 조회 요청 파라미터:', params);  // ✅ 추가
      const response = await api.get('/todo/todos/all/', { params, headers });
      return response.data;
    } catch (error) {
      console.error('전체 할 일 조회 오류:', error);
      throw error;
    }
  },

  /** 특정 필드의 할 일 목록 조회 **/
  getTodos: async (fieldId, start, end) => {
    try {
      const headers = await getAuthHeaders();
      const params = {};
      if (start) params.start = start;
      if (end) params.end = end;
      const url = `/todo/todos/${fieldId}/list/`;
      const response = await api.get(url, { params, headers });
      return response.data;
    } catch (error) {
      console.error('필드 할 일 조회 오류:', error);
      throw error;
    }
  },

  /** 특정 할 일 상세 조회 **/
  getTodo: async (taskId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await api.get(`/todo/todos/task/${taskId}/`, { headers });
      return response.data;
    } catch (error) {
      console.error('할 일 상세 조회 오류:', error);
      throw error;
    }
  },

  /** 새 할 일 생성 **/
  createTodo: async (fieldId, todoData) => {
    try {
      const headers = await getAuthHeaders();
      console.log('할 일 생성 요청 데이터:', todoData);  // ✅ 추가
      const response = await api.post(`/todo/todos/${fieldId}/list/`, todoData, { headers });
      return response.data;
    } catch (error) {
      console.error('할 일 생성 오류:', error);
      throw error;
    }
  },

  /** 할 일 수정 **/
  updateTodo: async (taskId, updates) => {
    try {
      const headers = await getAuthHeaders();
      const response = await api.patch(`/todo/todos/task/${taskId}/`, updates, { headers });
      return response.data;
    } catch (error) {
      console.error('할 일 수정 오류:', error);
      throw error;
    }
  },

  /** 할 일 삭제 **/
  deleteTodo: async (taskId) => {
    try {
      const headers = await getAuthHeaders();
      await api.delete(`/todo/todos/task/${taskId}/`, { headers });
      return true;
    } catch (error) {
      console.error('할 일 삭제 오류:', error);
      throw error;
    }
  },

  /** 월간 할 일 조회 **/
  getMonthlyTodos: async (fieldId, year, month) => {
    try {
      const headers = await getAuthHeaders();
      const response = await api.get(`/todo/todos/monthly/${fieldId}/`, {
        params: { year, month },
        headers
      });
      return response.data;
    } catch (error) {
      console.error('월간 할 일 조회 오류:', error);
      throw error;
    }
  },

  /** 진행도 업데이트 **/
  updateProgress: async (taskId, progresses) => {
    try {
      const headers = await getAuthHeaders();
      console.log('진행도 업데이트 요청 헤더:', headers);  // ✅ 추가

      const response = await api.patch(`/todo/todos/progress/${taskId}/`, { progresses }, { headers });
      return response.data;
    } catch (error) {
      console.error('진행도 업데이트 오류:', error);
      throw error;
    }
  },

  // 특정 노지의 오늘의 할 일 및 키워드/진행도 조회
  todayinfo: async (fieldId, date) => {
    try {
      const headers = await getAuthHeaders();
      const response = await api.get(
        `/todo/todos/fields/${fieldId}/today-info/`,
        {
          headers,
          params: { date } // 쿼리 파라미터로 날짜 전달
        }
      );
      return response.data;
    } catch (error) {
      console.error('오늘 할 일 조회 오류:', error);
      throw error;
    }
  },
  
  //** 캘린더용 포맷 변환 **/
  formatTodosForCalendar: (todos) => {
    if (!Array.isArray(todos)) return [];
    return todos.map(todo => {
      const start = moment(todo.start_date).format('YYYY-MM-DD');
      const end = moment(todo.start_date).add(todo.period - 1, 'days').format('YYYY-MM-DD');
      const isAnyDone = (todo.progresses || []).some(p => p.status === 'done');
      return {
        id: todo.task_id,
        title: todo.task_name,
        content: todo.task_content,
        type: todo.is_pest ? 'pest' : 'farming',
        start,
        end,
        field: todo.field,
        color: todo.is_pest ? '#e57373' : '#4d8b31',
        completed: isAnyDone,
        progresses: todo.progresses || []  
      };
    });
  }

};

export default todoService;