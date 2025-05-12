import axios from 'axios';
import authService from './authService';

export const setupAxiosInterceptors = (onInvalidToken) => {
  axios.interceptors.request.use(
    async (config) => {
        
        let token = authService.getAccessToken();

        if (token) {
            // 1. 토큰 검증 시도
            const verification = await authService.verifyToken();
            console.log('토큰 검증 결과:', verification);
            if (!verification.valid) {
            console.warn('토큰 유효성 검사 실패:', verification.reason);

            // 2. Refresh 시도
            const refreshResult = await authService.refreshAccessToken();

            if (!refreshResult.success) {
                console.warn('Refresh 실패:', refreshResult.reason);

                // 토큰이 유효하지 않으면 콜백 호출 (로그아웃 처리)
                if (onInvalidToken) {
                onInvalidToken();
                }

                return Promise.reject(new Error('토큰이 유효하지 않습니다.'));
            }

            token = refreshResult.access; // 새 토큰 적용
            }

            // 최종적으로 유효한 토큰을 헤더에 설정
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
        },
        (error) => Promise.reject(error)
    );
};
