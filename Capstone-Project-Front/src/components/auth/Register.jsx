import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  faEnvelope, 
  faLock, 
  faUser,
  faCheckCircle,
  faSpinner,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';

const Register = ({ onRegister }) => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // API 기본 URL
  const API_BASE_URL = 'http://orion.mokpo.ac.kr:8483';

  // 비밀번호 유효성 검사 함수
  const validatePassword = (password) => {
    // 최소 8자, 영문, 숫자, 특수문자 포함
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // 비밀번호 확인 검증
    if (name === 'confirmPassword' || name === 'password') {
      if (name === 'confirmPassword' && formData.password !== value) {
        setPasswordError('비밀번호가 일치하지 않습니다');
      } else if (name === 'password') {
        if (!validatePassword(value)) {
          setPasswordError('비밀번호는 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다');
        } else if (formData.confirmPassword && formData.confirmPassword !== value) {
          setPasswordError('비밀번호가 일치하지 않습니다');
        } else {
          setPasswordError('');
        }
      } else {
        setPasswordError('');
      }
    }
    
    // 에러 메시지 초기화
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 비밀번호 검증
    if (!validatePassword(formData.password)) {
      setPasswordError('비밀번호는 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('비밀번호가 일치하지 않습니다');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // 회원가입 API 호출
      const response = await axios.post(`${API_BASE_URL}/auth/register/`, {
        username: formData.name, // 백엔드 API 요구사항에 맞게 username 제공
        email: formData.email,
        password: formData.password
      });
      
      // 회원가입 성공 처리
      if (response.status === 201) {
        // 성공 메시지 출력 또는 리다이렉트
        alert('회원가입이 완료되었습니다. 로그인 해주세요.');
        // 메인 페이지 또는 로그인 페이지로 이동
        navigate('/login'); // 회원가입 후 자동 로그인되므로 메인 페이지로 이동
      } else {
        setError('회원가입에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('회원가입 오류:', error);
      
      // 오류 메시지 설정
      if (error.response) {
        // 이메일 중복 등의 오류 처리
        if (error.response.data && error.response.data.message) {
          setError(error.response.data.message);
        } else {
          setError('회원가입에 실패했습니다. 다시 시도해주세요.');
        }
      } else if (error.request) {
        setError('서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.');
      } else {
        setError('요청 처리 중 오류가 발생했습니다.');
      }
      
      // // CORS 오류 처리 (개발 환경에서만 사용)
      // if (process.env.NODE_ENV === 'development' && 
      //     (error.message === 'Network Error' || (error.response && error.response.status === 0))) {
      //   console.warn('CORS 오류 감지 - 개발 환경에서는 임시 처리됩니다');
      //   const fakeToken = `dev_${Date.now()}`;
      //   localStorage.setItem('token', fakeToken);
      //   navigate('/');
      // }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-logo">
          <span style={{ color: 'var(--primary-color)', fontSize: '36px' }}>🛸</span>
          <h1>농업드론관리</h1>
        </div>
        
        <div className="register-card">
          <h2 className="register-title">회원가입</h2>
          <p className="register-subtitle">농업 드론 관리 시스템에 가입하고 스마트 농업을 시작하세요</p>
          
          <form className="register-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">이름</label>
              <div className="input-with-icon">
                <FontAwesomeIcon icon={faUser} />
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="이름을 입력하세요"
                  required
                />
              </div>
            </div>
            
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
              <p className="password-hint">8자 이상, 영문, 숫자, 특수문자 포함</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">비밀번호 확인</label>
              <div className="input-with-icon">
                <FontAwesomeIcon icon={faLock} />
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="비밀번호를 다시 입력하세요"
                  required
                />
              </div>
              {passwordError && (
                <p className="error-message">
                  <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: '5px' }} />
                  {passwordError}
                </p>
              )}
            </div>
            
            {error && (
              <div className="error-message" style={{ marginBottom: '15px', textAlign: 'center' }}>
                <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: '5px' }} />
                {error}
              </div>
            )}
            
            <button 
              type="submit" 
              className="register-button" 
              disabled={isLoading || !formData.name || !formData.email || !formData.password || !formData.confirmPassword || passwordError}
            >
              {isLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '8px' }} />
                  처리 중...
                </>
              ) : '회원가입'}
            </button>
          </form>
          
          <div className="login-link">
            이미 계정이 있으신가요? <Link to="/login">로그인</Link>
          </div>
        </div>
        
        <div className="register-footer">
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

export default Register;