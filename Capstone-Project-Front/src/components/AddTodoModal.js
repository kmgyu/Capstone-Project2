// src/components/AddTodoModal.js
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import moment from 'moment';
import 'moment/locale/ko';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarPlus } from '@fortawesome/free-solid-svg-icons';
import '../css/AddTodoModal.css';
import todoService from '../services/todoService';

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
    fieldId: '', // 노지 ID 추가
  });
  
  // 노지 목록 상태
  const [fields, setFields] = useState([]);
  
  // 컴포넌트 마운트 시 세션 스토리지에서 노지 데이터를 가져옴
  useEffect(() => {
    const fieldsData = JSON.parse(sessionStorage.getItem('field_all')) || [];
    setFields(fieldsData);
  }, []);
  
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
  
  // 노지 선택되었는지 확인
  const isFieldSelected = Boolean(newTodoState.fieldId);
  
  // 일정 추가 핸들러
  const handleAddTodo = async (e) => {
    e.preventDefault();

    if (newTodoState.title.trim()) {
      try {
        const selectedField = fields.find(field => field.field_id.toString() === newTodoState.fieldId.toString());
        const startDateISO = moment(newTodoState.startDate).format('YYYY-MM-DDT00:00:00');
        
        const todoData = {
          task_name: newTodoState.title.trim(),
          task_content: newTodoState.content.trim(),
          start_date: startDateISO,
          period: parseInt(newTodoState.period) || 1,
          field_id: newTodoState.fieldId,
          field_name: selectedField ? selectedField.field_name : '',
        };

        // const fieldId = newTodoState.fieldId;

        // const createdTodo = await todoService.createTodo(fieldId, todoData);

        onAddTodo(todoData); // 부모 컴포넌트에 추가된 일정 전달
        onClose();  // 모달 닫기
      } catch (error) {
        alert('할 일 추가 중 오류가 발생했습니다.');
      }
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
          {/* 노지 선택 콤보 박스 */}
          <div className="form-group">
            <label htmlFor="fieldSelect">작업할 노지 선택<span className="required-mark">*</span></label>
            <select
              id="fieldSelect"
              name="fieldId"
              className={`field-select ${!isFieldSelected ? 'field-required' : ''}`}
              value={newTodoState.fieldId}
              onChange={handleInputChange}
              required
            >
              <option value="">노지를 선택하세요</option>
              {fields.map(field => (
                <option key={field.field_id} value={field.field_id}>
                  {field.field_name}
                </option>
              ))}
            </select>
            {!isFieldSelected && (
              <p className="field-error-message">작업할 노지를 선택해야 합니다</p>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="todoTitle">할 일 제목<span className="required-mark">*</span></label>
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
            <button 
              type="submit" 
              className="submit-button"
              disabled={!isFieldSelected || !newTodoState.title.trim() }
            >
              추가
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddTodoModal;