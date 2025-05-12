import axios from 'axios';

const API_BASE_URL = 'http://orion.mokpo.ac.kr:8483';

const authService = {
  /** 현재 저장된 Access Token 반환 */
  getAccessToken() {
    return sessionStorage.getItem('token');
  },

  /** 현재 저장된 Refresh Token 반환 */
  getRefreshToken() {
    return sessionStorage.getItem('refreshToken');
  },

  /** 현재 저장된 사용자 정보 반환 */
  getUser() {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  /** 토큰 검증 요청 */
  async verifyToken() {
    const token = this.getAccessToken();
    if (!token) return { valid: false, reason: 'missing' };

    try {
      const response = await axios.get(`${API_BASE_URL}/auth/auth`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { valid: true, user: response.data };
    } catch (error) {
      const reason = error.response?.data?.detail || 'unknown';
      return { valid: false, reason };
    }
  },

  /** Refresh Token으로 새 Access Token 요청 */
  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    console.log('refreshToken:', refreshToken);
    if (!refreshToken) return { success: false, reason: 'missing_refresh' };

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
        refresh: refreshToken,
      });
      const { access, refresh } = response.data;
      sessionStorage.setItem('token', access);
      sessionStorage.setItem('refreshToken', refresh);
      return { success: true, access, refresh };
    } catch (error) {
      const reason = error.response?.data?.detail || 'refresh_failed';
      return { success: false, reason };
    }
  },

  /** 로그아웃 처리 */
  logout() {
    sessionStorage.clear();
    localStorage.clear();
  },
};

export default authService;
