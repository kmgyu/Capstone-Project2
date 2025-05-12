import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import '../css/Modal.css';

const Modal = ({ isOpen, onClose, title, children, className = '' }) => {
  const modalRef = useRef(null);
  
  // ESC 키를 누르면 모달 닫기
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // 모달이 열릴 때 body 스크롤 방지
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      // 모달이 닫힐 때 body 스크롤 복원
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);
  
  // 모달 외부 클릭 시 닫기
  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };
  
  // 모달이 닫혀있으면 아무것도 렌더링하지 않음
  if (!isOpen) return null;
  
  // React Portal을 사용하여 DOM의 최상위에 모달 렌더링
  return createPortal(
    <div 
      className="modal-overlay" 
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className={`modal-container ${className}`}
        ref={modalRef}
        tabIndex="-1"
      >
        <div className="modal-header">
          {title && <h2 className="modal-title">{title}</h2>}
          <button 
            className="modal-close" 
            onClick={onClose}
            aria-label="닫기"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;