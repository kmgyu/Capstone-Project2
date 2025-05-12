import React, { useState } from 'react';
import moment from 'moment';
import '../css/TodoList.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';

const TodoList = ({ date, todos, onAddTodo, onDeleteTodo, onToggleComplete }) => {
  const [newTodoText, setNewTodoText] = useState('');
  
  // 선택된 날짜 포맷팅
  const formattedDate = moment(date).format('YYYY년 M월 D일');
  
  // Todo 추가 함수
  const addTodo = (e) => {
    e.preventDefault();
    
    if (newTodoText.trim() === '') return;
    
    const newTodo = {
      title: newTodoText,
      type: 'farming', // 기본값
      start: date,
      end: date,
      color: '#4CAF50', // 기본 색상
      completed: false
    };
    
    onAddTodo(newTodo);
    setNewTodoText(''); // 입력 필드 초기화
  };

  return (
    <section className="todo-section">
      <h3 className="section-title">{formattedDate} 할 일</h3>
      <form className="todo-form" onSubmit={addTodo}>
        <input 
          type="text" 
          className="todo-input" 
          placeholder="할 일 추가..." 
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
        />
        <button type="submit" className="todo-button">
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </form>
      {todos.length === 0 ? (
        <p className="no-todos">이 날짜에 예정된 일정이 없습니다.</p>
      ) : (
        <ul className="todo-list">
          {todos.map(todo => (
            <li 
              key={todo.id} 
              className={`todo-item ${todo.completed ? 'completed' : ''}`}
              style={{ borderLeft: `4px solid ${todo.color}` }}
            >
              <input 
                type="checkbox" 
                className="todo-checkbox" 
                checked={todo.completed || false}
                onChange={() => onToggleComplete(todo.id)}
              />
              <span className="todo-text">
                {todo.title}
                {todo.start !== todo.end && (
                  <small className="todo-date">
                    {` (${moment(todo.start).format('M/D')} ~ ${moment(todo.end).format('M/D')})`}
                  </small>
                )}
              </span>
              <span className="todo-type">{todo.type === 'farming' ? '농사' : '병충해'}</span>
              <button 
                className="todo-delete"
                onClick={() => onDeleteTodo(todo.id)}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default TodoList;