import React from 'react';
import '../css/Hero.css';

const Hero = () => {
  return (
    <section className="hero-section">
      <div className="hero-content">
        <h2 className="hero-title">
          스마트한 농업의 시작,<br />드론으로 관리하세요
        </h2>
        <p className="hero-subtitle">
          효율적인 농작물 관리와 모니터링을 위한 드론 일정 관리 시스템으로 
          더 스마트한 농업을 경험해보세요.
        </p>
        <a href="#" className="cta-button">시작하기</a>
      </div>
      <img 
        src='../../public/logo192.png'
        alt="농업 드론 이미지" 
        className="hero-image" 
      />
    </section>
  );
};

export default Hero;