// src/services/todoService.js
import axios from 'axios';
import moment from 'moment';

// API 기본 URL 설정
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://orion.mokpo.ac.kr:8483';

// Axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 요청 인터셉터 - 모든 요청에 토큰 추가
apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const todoService = {
  // 사용자의 모든 Todo 가져오기
  getUserTodos: async (userId) => {
    try {
      const response = await apiClient.get(`/todo/todos/user/`, {
        params: { owner_id: userId }
      });
      return response.data;
    } catch (error) {
      console.error('사용자 Todo 가져오기 오류:', error);
      throw error;
    }
  },
  
  // 특정 필드의 Todo 가져오기
  getFieldTodos: async (fieldId) => {
    try {
      const response = await apiClient.get(`/todo/todos/field/${fieldId}/`);
      return response.data;
    } catch (error) {
      console.error('필드 Todo 가져오기 오류:', error);
      throw error;
    }
  },
  
  // 새 Todo 생성
  createTodo: async (fieldId, todoData) => {
    try {
      const response = await apiClient.post(`/todo/todos/field/${fieldId}/`, todoData);
      return response.data;
    } catch (error) {
      console.error('Todo 생성 오류:', error);
      throw error;
    }
  },
  
  // 특정 Todo 가져오기
  getTodo: async (todoId) => {
    try {
      const response = await apiClient.get(`/todo/todos/task/${todoId}/`);
      return response.data;
    } catch (error) {
      console.error('Todo 상세 가져오기 오류:', error);
      throw error;
    }
  },
  
  // Todo 수정
  updateTodo: async (todoId, todoData) => {
    try {
      const response = await apiClient.put(`/todo/todos/task/${todoId}/`, todoData);
      return response.data;
    } catch (error) {
      console.error('Todo 수정 오류:', error);
      throw error;
    }
  },
  
  // Todo 삭제
  deleteTodo: async (todoId) => {
    try {
      await apiClient.delete(`/todo/todos/task/${todoId}/`);
      return true;
    } catch (error) {
      console.error('Todo 삭제 오류:', error);
      throw error;
    }
  },
  
  // API 응답 데이터를 캘린더 형식으로 변환
  formatTodosForCalendar: (todos) => {
    if (!Array.isArray(todos)) {
      console.error('formatTodosForCalendar: todos is not an array', todos);
      return [];
    }
    
    return todos.map(todo => {
      // 백엔드 응답 형식에 맞게 필드명 매핑
      const startDate = moment(todo.start_date).format('YYYY-MM-DD');
      const endDate = moment(todo.start_date)
        .add(todo.period - 1, 'days')
        .format('YYYY-MM-DD');
      
      return {
        id: todo.task_id,
        title: todo.task_name,
        content: todo.task_content,
        type: todo.is_pest ? 'pest' : 'farming',
        start: startDate,
        end: endDate,
        field: todo.field,
        color: todo.is_pest ? '#e57373' : '#4d8b31', // 병충해는 빨간색, 농사는 녹색
        completed: false // 백엔드에서 완료 상태를 제공하지 않으므로 기본값 false
      };
    });
  }
};

export default todoService;