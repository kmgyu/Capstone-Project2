import React, { useState, useEffect } from 'react'; // useEffect 추가!
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEnvelope, 
  faLock, 
  faSpinner, 
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();

  // (1) rememberedEmail을 localStorage에서 불러와서 초기값에 반영
  const rememberedEmail = localStorage.getItem('rememberedEmail') || '';

  const [formData, setFormData] = useState({
    email: rememberedEmail, // 기억된 이메일이 있으면 미리 채워줌
    password: '',
    rememberMe: !!rememberedEmail // 이메일이 있으면 기본으로 체크
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // API 기본 URL
  const API_BASE_URL = 'http://orion.mokpo.ac.kr:8483';

  // (2) 컴포넌트가 마운트될 때 한번 더 localStorage 확인 (혹시 필요하다면)
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail') || '';
    if (savedEmail) {
      setFormData(prev => ({
        ...prev,
        email: savedEmail,
        rememberMe: true
      }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });

    // 입력 시 에러 메시지 초기화
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 간단한 유효성 검사
    if (!formData.email || !formData.password) {
      setError('이메일과 비밀번호를 모두 입력해주세요.');
      setLoading(false);
      return;
    }

    try {
      // 로그인 API 호출
      const response = await axios.post(`${API_BASE_URL}/auth/auth/`, {
        email: formData.email,
        password: formData.password
      });

      // 로그인 성공
      if (response.data && response.data.token) {
        // (3) rememberMe 체크시 로컬스토리지에 이메일 저장, 아니면 삭제
        if (formData.rememberMe) {
          localStorage.setItem('rememberedEmail', formData.email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }

        if (onLogin) {
          onLogin(response.data.token, response.data.user, formData.rememberMe);
        }
        navigate('/');
      } else {
        setError('로그인에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('로그인 오류:', error);

      // 오류 메시지 설정
      if (error.response) {
        setError(error.response.data.message || '이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (error.request) {
        setError('서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.');
      } else {
        setError('요청 처리 중 오류가 발생했습니다.');
      }

    } finally {
      setLoading(false);
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
          <h2 className="login-title">로그인</h2>
          <p className="login-subtitle">농업 드론 관리 시스템에 오신 것을 환영합니다</p>
          
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">이메일</label>
              <div className="input-with-icon">
                <FontAwesomeIcon icon={faEnvelope} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="이메일 주소를 입력하세요"
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="password">비밀번호</label>
              <div className="input-with-icon">
                <FontAwesomeIcon icon={faLock} />
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="비밀번호를 입력하세요"
                  required
                />
              </div>
            </div>
            
            {error && (
              <div className="error-message" style={{ marginBottom: '15px', textAlign: 'center', color: '#e74c3c' }}>
                {error}
              </div>
            )}
            
            <div className="form-options">
              <div className="remember-me">
                <input
                  type="checkbox"
                  id="rememberMe"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                />
                <label htmlFor="rememberMe">로그인 정보 기억</label>
              </div>
              <Link to="/forgot-password" className="forgot-password">비밀번호 찾기</Link>
            </div>
            
            <button 
              type="submit" 
              className="login-button" 
              disabled={loading}
              style={loading ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
            >
              {loading ? (
                <span>
                  <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '8px' }} />
                  로그인 중...
                </span>
              ) : (
                '로그인'
              )}
            </button>
          </form>
          
          <div className="signup-link">
            계정이 없으신가요? <Link to="/register">회원가입</Link>
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

export default Login;
