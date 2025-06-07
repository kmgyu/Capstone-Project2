import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSun,
  faCloudSun,
  faCloud,
  faCloudRain,
  faCloudShowersHeavy,
  faSnowflake,
  faUser,
  faBars,
  faSignOutAlt
} from '@fortawesome/free-solid-svg-icons';
import '../css/Header.css';
import weatherService from '../services/weatherService';
import authService from '../services/authService';

const weatherIconMap = {
  '맑음':            faSun,
  '구름많음':        faCloudSun,
  '흐림':            faCloud,
  '비':              faCloudRain,
  '소나기':          faCloudShowersHeavy,
  '비/눈':           faCloudShowersHeavy,
  '눈':              faSnowflake
};

const Header = ({ onLogout, field }) => {
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [weatherInfo, setWeatherInfo] = useState({
    icon: faSun,
    description: '맑음',
    temperature: 22
  });
  const [name, setName] = useState(''); 

  useEffect(() => {
    const storedName = localStorage.getItem('username') || sessionStorage.getItem('username');
    if (storedName) {
      setName(storedName);
    }
  }, []);

  useEffect(() => {
    let retryId = null;
    let intervalId = null;
    let unmounted = false;

    const fetchWeather = async () => {
      const fieldId = field?.field_id || sessionStorage.getItem('main_field');
      const token   = authService.getAccessToken();
      if (!fieldId || !token) return false;           // 준비 안 됨

      try {
        console.log('날씨 정보 요청:', fieldId);
        const data = await weatherService.getWeather(fieldId);
        console.log('날씨 정보 응답:', data);
        if (unmounted) return true;
        setWeatherInfo({
          icon: weatherIconMap[data.weather] ?? faSun,
          description: data.weather,
          temperature: Math.round(data.temperature)
        });
        return true;                                  // 성공
      } catch (e) {
        if (e.response?.status !== 401) console.error('날씨 실패:', e);
        return false;
      }
    };

    // 1초 간격 재시도
    retryId = setInterval(async () => {
      if (await fetchWeather()) {
        clearInterval(retryId);
        intervalId = setInterval(fetchWeather, 30 * 60 * 1000); // 30 min
      }
    }, 5000);

    return () => {
      unmounted = true;
      clearInterval(retryId);
      clearInterval(intervalId);
    };
  }, [field]);

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  const toggleUserDropdown = () => {
    setShowUserDropdown(!showUserDropdown);
  };

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      sessionStorage.clear();
      // 로그아웃 함수 호출
      onLogout && onLogout();
      // 로그인 페이지로 이동
      navigate('/login');
    }
  };

  return (
    <header>
      <div className="container header-container">
        <div className="logo">
          <FontAwesomeIcon 
            // icon={faDrone} 
            style={{ color: 'var(--primary-color)', fontSize: '28px' }} 
          />
          <h1>EarlyBird</h1>
        </div>
        
        <ul className={`nav-menu ${showMobileMenu ? 'show-mobile-menu' : ''}`}>
          <li><Link to="/" className={window.location.pathname === '/' ? 'active' : ''}>홈</Link></li>
          <li><Link to="/droneview" className={window.location.pathname === '/droneview' ? 'active' : ''}>드론 현황</Link></li>
          <li><Link to="/farmland" className={window.location.pathname === '/farmland' ? 'active' : ''}>농장 관리</Link></li>
          <li><a href="#">도움말</a></li>
        </ul>
        
        <div className="header-right">
          <div className="weather-info">
            <FontAwesomeIcon icon={weatherInfo.icon} />
            <span id="weather-text">
              {weatherInfo.temperature}°C
            </span>
          </div>
          
          <div className="user-profile" onClick={toggleUserDropdown}>
            <div className="user-avatar">
              <FontAwesomeIcon icon={faUser} />
            </div>
            <span>{name}</span>
            
            {/* 사용자 드롭다운 메뉴 */}
            {showUserDropdown && (
              <div className="user-dropdown">
                <button onClick={handleLogout} className="logout-button">
                  <FontAwesomeIcon icon={faSignOutAlt} /> 로그아웃
                </button>
              </div>
            )}
          </div>
          
          <div className="hamburger-menu" onClick={toggleMobileMenu}>
            <FontAwesomeIcon icon={faBars} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;