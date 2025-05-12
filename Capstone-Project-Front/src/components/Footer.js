import React from 'react';
import '../css/Footer.css';
// Font Awesome 아이콘을 사용하기 위한 import
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFacebookF, 
  faTwitter, 
  faInstagram, 
  faYoutube 
} from '@fortawesome/free-brands-svg-icons';
import { 
  faMapMarkerAlt, 
  faPhone, 
  faEnvelope 
} from '@fortawesome/free-solid-svg-icons';

const Footer = () => {
    return (
        <footer>
            <div className="container">
                <div className="footer-container">
                    <div className="footer-column">
                        <h3>농업드론관리</h3>
                        <p>최신 드론 기술을 활용한 스마트 농업 관리 시스템으로 농장 운영을 더욱 효율적으로 만들어 드립니다.</p>
                        <div className="social-links">
                            <a href="#"><FontAwesomeIcon icon={faFacebookF} /></a>
                            <a href="#"><FontAwesomeIcon icon={faTwitter} /></a>
                            <a href="#"><FontAwesomeIcon icon={faInstagram} /></a>
                            <a href="#"><FontAwesomeIcon icon={faYoutube} /></a>
                        </div>
                    </div>
                    <div className="footer-column">
                        <h3>주요 기능</h3>
                        <ul className="footer-links">
                            <li><a href="#">작업 일정 관리</a></li>
                            <li><a href="#">농장 지도 관리</a></li>
                        </ul>
                    </div>
                    <div className="footer-column">
                        <h3>고객 지원</h3>
                        <ul className="footer-links">
                            <li><a href="#">자주 묻는 질문</a></li>
                            <li><a href="#">이용 가이드</a></li>
                            <li><a href="#">문의하기</a></li>
                        </ul>
                    </div>
                    <div className="footer-column">
                        <h3>연락처</h3>
                        <p><FontAwesomeIcon icon={faMapMarkerAlt} /> 전라남도 목포시</p>
                        <p><FontAwesomeIcon icon={faPhone} /> 02-123-4567</p>
                        <p><FontAwesomeIcon icon={faEnvelope} /> info@farmdrone.kr</p>
                    </div>
                </div>
                <div className="copyright">
                    &copy; 2025 농업드론관리 시스템. All Rights Reserved.
                </div>
            </div>
        </footer>
    )
}

export default Footer;