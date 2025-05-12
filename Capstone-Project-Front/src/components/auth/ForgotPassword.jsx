import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  faEnvelope, 
  faCheckCircle, 
  faArrowLeft,
  faExclamationTriangle,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
const API_BASE_URL = 'http://orion.mokpo.ac.kr:8483';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // axios 인스턴스 생성
  const api = axios.create({
    baseURL: '/auth/',  // package.json에 proxy가 설정되어 있으므로 상대 경로 사용
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('이메일을 입력해주세요.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      console.log(email)
      // 수정된 API 호출 (상대 경로 사용)
      const response = await api.post(`${API_BASE_URL}/auth/forgot-password/`, {
        email: email
      });
      
      if (response.data && response.data.success) {
        // 성공 상태로 변경
        setSubmitted(true);
      } else {
        // 서버에서 success: false를 반환한 경우
        setError(response.data.message || '비밀번호 재설정 이메일 발송에 실패했습니다.');
      }
    } catch (error) {
      console.error('비밀번호 재설정 요청 오류:', error);
      
      // 오류 메시지 설정
      if (error.response) {
        // 서버에서 응답을 받은 경우
        setError(error.response.data.message || '서버 오류가 발생했습니다.');
      } else if (error.request) {
        // 요청은 보냈지만 응답을 받지 못한 경우
        setError('서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.');
      } else {
        // 요청 설정 중 오류 발생
        setError('요청 처리 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-logo">
          <span style={{ color: 'var(--primary-color)', fontSize: '36px' }}>🛸</span>
          <h1>농업드론관리</h1>
        </div>
        
        <div className="login-card">
          {!submitted ? (
            <>
              <h2 className="login-title">비밀번호 찾기</h2>
              <p className="login-subtitle">가입하신 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다</p>
              
              <form className="login-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email">이메일</label>
                  <div className="input-with-icon">
                    <FontAwesomeIcon icon={faEnvelope} />
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="가입하신 이메일 주소를 입력하세요"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  {error && (
                    <p className="error-message">
                      <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: '5px' }} />
                      {error}
                    </p>
                  )}
                </div>
                
                <button 
                  type="submit" 
                  className="login-button" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '8px' }} />
                      처리 중...
                    </>
                  ) : '재설정 링크 받기'}
                </button>
              </form>
            </>
          ) : (
            <div className="success-message">
              <FontAwesomeIcon icon={faCheckCircle} style={{ color: 'var(--primary-color)', fontSize: '48px', marginBottom: '20px', display: 'block', textAlign: 'center' }} />
              <h2 style={{ textAlign: 'center', marginBottom: '15px' }}>이메일이 전송되었습니다</h2>
              <p style={{ marginBottom: '20px', textAlign: 'center' }}>
                {email} 주소로 비밀번호 재설정 링크를 보냈습니다. 이메일을 확인하고 링크를 클릭하여 비밀번호를 재설정해주세요.
              </p>
              <p className="info-note" style={{ fontSize: '14px', color: '#888', marginBottom: '20px', textAlign: 'center' }}>
                이메일이 도착하지 않았나요? 스팸함을 확인하거나 다시 시도해 보세요.
              </p>
              <button 
                onClick={() => setSubmitted(false)} 
                className="login-button" 
                style={{ width: '100%', marginBottom: '15px' }}
              >
                다시 시도
              </button>
            </div>
          )}
          
          <div className="login-link" style={{ marginTop: '20px', textAlign: 'center' }}>
            <Link to="/login" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>
              <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: '5px' }} /> 로그인으로 돌아가기
            </Link>
          </div>
        </div>
        
        <div className="login-footer">
          <p>&copy; 2025 농업드론관리 시스템. All Rights Reserved.</p>
          <div className="auth_footer-links">
            <a href="#">이용약관</a>
            <a href="#">개인정보처리방침</a>
            <a href="#">고객센터</a>
          </div>
        </div>
      </div>
      
      <div className="login-background">
        <div className="login-info">
          <h2>스마트한 농업의 시작</h2>
          <p>효율적인 농작물 관리와 모니터링을 위한<br/>드론 일정 관리 시스템으로<br/>더 스마트한 농업을 경험해보세요.</p>
          <ul className="login-features">
            <li><FontAwesomeIcon icon={faCheckCircle} /> 실시간 모니터링</li>
            <li><FontAwesomeIcon icon={faCheckCircle} /> 간편한 작업 일정 관리</li>
            <li><FontAwesomeIcon icon={faCheckCircle} /> 농작물 상태 분석</li>
            <li><FontAwesomeIcon icon={faCheckCircle} /> 정밀 농업 지원</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;