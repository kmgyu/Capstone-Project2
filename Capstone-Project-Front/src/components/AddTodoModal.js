// src/components/AddTodoModal.js
import React, { useState } from 'react';
import Modal from './Modal';
import moment from 'moment';
import 'moment/locale/ko';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarPlus } from '@fortawesome/free-solid-svg-icons';
import '../css/AddTodoModal.css';

const AddTodoModal = ({ 
  isOpen, 
  onClose, 
  date, 
  onAddTodo
}) => {
  // 날짜 형식 포맷팅
  const formattedDate = date ? moment(date).format('YYYY년 M월 D일') : '날짜 없음';
  
  // 입력 상태 관리
  const [newTodoState, setNewTodoState] = useState({
    title: '',
    content: '',
    startDate: date || new Date().toISOString().split('T')[0],
    period: 1, // 기본 기간 (일)
  });
  
  // 종료일은 시작일 + 기간으로 자동 계산
  const calculatedEndDate = newTodoState.startDate 
    ? moment(newTodoState.startDate)
        .add(newTodoState.period - 1, 'days')
        .format('YYYY-MM-DD')
    : '';
  
  // 입력 변경 핸들러
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTodoState(prev => ({
      ...prev,
      [name]: name === 'period' ? Math.max(1, parseInt(value) || 1) : value
    }));
  };
  
  // 일정 추가 핸들러
  const handleAddTodo = (e) => {
    e.preventDefault();
    
    if (typeof onAddTodo !== 'function') {
      console.error('onAddTodo 함수가 없습니다');
      return;
    }
    
    if (newTodoState.title.trim()) {
      // 추가할 할 일 데이터 구성 - 항상 타입은 farming(농사)로 설정
      const newTodo = {
        title: newTodoState.title.trim(),
        content: newTodoState.content.trim(),
        type: 'farming', // 항상 농사 작업으로 설정
        start: newTodoState.startDate,
        end: calculatedEndDate, // 계산된 종료일 사용
        period: parseInt(newTodoState.period) || 1,
        color: '#4d8b31', // 농사 작업은 초록색 (앱 테마 색상)
        completed: false
      };
      
      onAddTodo(newTodo);
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="add-todo-modal-title">
          <FontAwesomeIcon icon={faCalendarPlus} className="add-icon" />
          <span>새 일정 추가</span>
          <span className="selected-date">({formattedDate})</span>
        </div>
      }
      className="add-todo-modal"
    >
      <div className="add-todo-modal-content">
        {/* 일정 추가 폼 */}
        <form className="add-todo-form" onSubmit={handleAddTodo}>
          <div className="form-group">
            <label htmlFor="todoTitle">할 일 제목</label>
            <input 
              type="text" 
              id="todoTitle"
              className="todo-input" 
              placeholder="할 일 제목을 입력하세요" 
              name="title"
              value={newTodoState.title}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="todoContent">상세 내용</label>
            <textarea 
              id="todoContent"
              className="todo-textarea" 
              placeholder="상세 내용을 입력하세요" 
              name="content"
              value={newTodoState.content}
              onChange={handleInputChange}
              rows={3}
            ></textarea>
          </div>
          
          <div className="date-options">
            <div className="form-group">
              <label htmlFor="startDate">시작일</label>
              <input 
                type="date" 
                id="startDate"
                name="startDate"
                value={newTodoState.startDate}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="todoPeriod">작업 기간 (일)</label>
              <input 
                type="number" 
                id="todoPeriod"
                name="period"
                value={newTodoState.period}
                onChange={handleInputChange}
                min="1"
              />
            </div>
            
            <div className="form-group">
              <label>종료일 (자동 계산)</label>
              <input 
                type="date" 
                value={calculatedEndDate}
                disabled
                className="disabled-input"
              />
            </div>
          </div>
          
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>취소</button>
            <button type="submit" className="submit-button">추가</button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddTodoModal;