// src/components/TodoModal.js
import React, { useState } from 'react';
import Modal from './Modal';
import moment from 'moment';
import 'moment/locale/ko';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDay, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import AddTodoModal from './AddTodoModal'; // 새로운 모달 컴포넌트 추가
import '../css/TodoModal.css';

const TodoModal = ({ 
  isOpen, 
  onClose, 
  date, 
  todos, 
  onAddTodo,
  onDeleteTodo,
  onToggleComplete
}) => {
  // 안전한 todos 처리
  const safeRenderTodos = Array.isArray(todos) ? todos : [];
  
  // 날짜 형식 포맷팅
  const formattedDate = date ? moment(date).format('YYYY년 M월 D일') : '날짜 없음';
  const dayOfWeek = date ? moment(date).format('dddd') : '';
  
  // 할일 추가 모달 상태
  const [addModalOpen, setAddModalOpen] = useState(false);
  
  // 할일 추가 모달 열기
  const openAddModal = () => {
    setAddModalOpen(true);
  };
  
  // 할일 추가 모달 닫기
  const closeAddModal = () => {
    setAddModalOpen(false);
  };
  
  // 새 할일 추가 핸들러
  const handleAddTodo = (newTodo) => {
    if (typeof onAddTodo === 'function') {
      try {
        onAddTodo(newTodo);
        closeAddModal();
      } catch (error) {
        console.error('일정 추가 중 오류:', error);
      }
    } else {
      console.error('onAddTodo 함수가 없습니다');
    }
  };
  
  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="todo-modal-title">
            <FontAwesomeIcon icon={faCalendarDay} className="date-icon" />
            <span>{formattedDate}</span>
            <span className="day-of-week">({dayOfWeek})</span>
          </div>
        }
        className="todo-modal"
      >
        <div className="todo-modal-content">
          <div className="todo-header">
            <h3 className="todo-list-title">일정 목록</h3>
            <button className="add-todo-button" onClick={openAddModal}>
              <FontAwesomeIcon icon={faPlus} /> 일정 추가
            </button>
          </div>
          
          {/* 할 일 목록 부분 */}
          {safeRenderTodos.length === 0 ? (
            <div className="no-todos">
              <p>이 날짜에 예정된 일정이 없습니다.</p>
              <p className="add-todo-prompt">새로운 일정을 추가해보세요!</p>
            </div>
          ) : (
            <ul className="todo-list">
              {safeRenderTodos.map(todo => {
                const isChecked = todo.progresses?.some(p => p.date === date && p.status === 'done');

                return (
                  <li 
                    key={todo.id || Math.random()} 
                    className={`todo-item ${isChecked ? 'completed' : ''}`}
                    style={{ borderLeft: `4px solid ${todo.color || '#4CAF50'}` }}
                  >
                    <div className="todo-checkbox-wrapper">
                      <input 
                        type="checkbox" 
                        id={`todo-checkbox-${todo.id}`}
                        className="todo-checkbox" 
                        checked={isChecked}
                        onChange={() => typeof onToggleComplete === 'function' ? onToggleComplete(todo.id, date) : null}
                      />
                      <label htmlFor={`todo-checkbox-${todo.id}`} className="todo-checkbox-label"></label>
                    </div>
                    
                    <div className="todo-content">
                      <span className="todo-text">
                        {todo.title}
                        {todo.start !== todo.end && (
                          <small className="todo-date">
                            {` (${moment(todo.start).format('M/D')} ~ ${moment(todo.end).format('M/D')})`}
                          </small>
                        )}
                      </span>
                      {todo.content && <p className="todo-detail">{todo.content}</p>}
                      <div className="todo-meta">
                        <span className={`todo-status ${isChecked ? 'completed-status' : 'pending-status'}`}>
                          {isChecked ? '완료' : '진행중'}
                        </span>
                      </div>
                    </div>
                    
                    <button 
                      className="delete-button"
                      onClick={() => typeof onDeleteTodo === 'function' ? onDeleteTodo(todo.id) : null}
                      aria-label="삭제"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Modal>
      
      {/* 할일 추가 모달 */}
      {addModalOpen && (
        <AddTodoModal
          isOpen={addModalOpen}
          onClose={closeAddModal}
          date={date}
          onAddTodo={handleAddTodo}
        />
      )}
    </>
  );
};

export default TodoModal;