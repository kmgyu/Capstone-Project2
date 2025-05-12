import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  faCheckCircle,
  faLock,
  faArrowLeft,
  faExclamationCircle,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [serverError, setServerError] = useState('');

  // axios 인스턴스 생성
  const api = axios.create({
    baseURL: '/auth',  // package.json에 proxy가 설정되어 있으므로 상대 경로 사용
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  // 비밀번호 유효성 검사 함수
  const validatePassword = (password) => {
    // 최소 8자, 영문, 숫자, 특수문자 포함
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
  };

  // 토큰 유효성 검사
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await api.get(`/reset-password/${token}/verify/`);
        
        if (response.data.valid) {
          setIsValid(true);
        } else {
          setIsValid(false);
        }
      } catch (error) {
        console.error('토큰 검증 오류:', error);
        setIsValid(false);
      } finally {
        setIsVerifying(false);
      }
    };

    if (token) {
      verifyToken();
    }
  }, [token]);

  // 완료 후 카운트다운
  useEffect(() => {
    if (completed) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/login/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [completed, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // 비밀번호 확인 검증
    if (name === 'confirmPassword') {
      if (formData.password !== value) {
        setPasswordError('비밀번호가 일치하지 않습니다');
      } else {
        setPasswordError('');
      }
    } else if (name === 'password') {
      // 비밀번호 정책 검증
      if (!validatePassword(value)) {
        setPasswordError('비밀번호는 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다');
      } else if (formData.confirmPassword && formData.confirmPassword !== value) {
        setPasswordError('비밀번호가 일치하지 않습니다');
      } else if (formData.confirmPassword === value) {
        setPasswordError('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('비밀번호가 일치하지 않습니다');
      return;
    }
    
    if (!validatePassword(formData.password)) {
      setPasswordError('비밀번호는 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다');
      return;
    }
    
    setIsLoading(true);
    setServerError('');
    
    try {
      // 비밀번호 재설정 API 호출
      const response = await api.post(`/reset-password/${token}/`, {
        password: formData.password
      });
      
      if (response.data && response.data.success) {
        // 성공 상태로 변경
        setCompleted(true);
      } else {
        // 서버에서 success: false를 반환한 경우
        setServerError(response.data.message || '비밀번호 재설정에 실패했습니다.');
      }
    } catch (error) {
      console.error('비밀번호 재설정 오류:', error);
      
      if (error.response) {
        setServerError(error.response.data.message || '서버 오류가 발생했습니다.');
      } else if (error.request) {
        setServerError('서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.');
      } else {
        setServerError('요청 처리 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 로딩 상태 표시
  if (isVerifying) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-logo">
            <span style={{ color: 'var(--primary-color)', fontSize: '36px' }}>🛸</span>
            <h1>농업드론관리</h1>
          </div>
          
          <div className="login-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <div style={{ textAlign: 'center' }}>
              <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '48px', color: 'var(--primary-color)', marginBottom: '20px' }} />
              <p>토큰 검증 중...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 유효하지 않은 토큰
  if (!isValid) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-logo">
            <span style={{ color: 'var(--primary-color)', fontSize: '36px' }}>🛸</span>
            <h1>농업드론관리</h1>
          </div>
          
          <div className="login-card">
            <div className="error-container" style={{ textAlign: 'center', padding: '20px' }}>
              <FontAwesomeIcon icon={faExclamationCircle} style={{ color: '#e74c3c', fontSize: '48px', marginBottom: '20px', display: 'block' }} />
              <h2 style={{ marginBottom: '15px' }}>유효하지 않은 링크</h2>
              <p style={{ marginBottom: '20px' }}>
                비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다.
              </p>
              <Link to="/forgot-password" className="login-button" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
                새 링크 요청하기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 비밀번호 재설정 완료
  if (completed) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-logo">
            <span style={{ color: 'var(--primary-color)', fontSize: '36px' }}>🛸</span>
            <h1>농업드론관리</h1>
          </div>
          
          <div className="login-card">
            <div className="success-message" style={{ textAlign: 'center', padding: '20px' }}>
              <FontAwesomeIcon icon={faCheckCircle} style={{ color: 'var(--primary-color)', fontSize: '48px', marginBottom: '20px', display: 'block' }} />
              <h2 style={{ marginBottom: '15px' }}>비밀번호가 재설정되었습니다</h2>
              <p style={{ marginBottom: '20px' }}>
                새 비밀번호로 로그인할 수 있습니다.
              </p>
              <p style={{ marginBottom: '20px', fontSize: '14px', color: '#888' }}>
                {countdown}초 후에 로그인 페이지로 이동합니다...
              </p>
              <Link to="/login/" className="login-button" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
                로그인하러 가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 비밀번호 재설정 폼
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-logo">
          <span style={{ color: 'var(--primary-color)', fontSize: '36px' }}>🛸</span>
          <h1>농업드론관리</h1>
        </div>
        
        <div className="login-card">
          <h2 className="login-title">비밀번호 재설정</h2>
          <p className="login-subtitle">새로운 비밀번호를 입력해주세요</p>
          
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password">새 비밀번호</label>
              <div className="input-with-icon">
                <FontAwesomeIcon icon={faLock} />
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="새 비밀번호를 입력하세요"
                  required
                  disabled={isLoading}
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
                  placeholder="새 비밀번호를 다시 입력하세요"
                  required
                  disabled={isLoading}
                />
              </div>
              {passwordError && <p className="error-message">{passwordError}</p>}
              {serverError && (
                <p className="error-message" style={{ marginTop: '10px' }}>
                  <FontAwesomeIcon icon={faExclamationCircle} style={{ marginRight: '5px' }} />
                  {serverError}
                </p>
              )}
            </div>
            
            <button 
              type="submit" 
              className="login-button"
              disabled={isLoading || !formData.password || !formData.confirmPassword || passwordError}
            >
              {isLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '8px' }} />
                  처리 중...
                </>
              ) : '비밀번호 재설정'}
            </button>
          </form>
          
          <div className="login-link" style={{ marginTop: '20px', textAlign: 'center' }}>
            <Link to="/login/" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>
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

export default ResetPassword;