import { useState } from 'react';
import { Calendar, CheckCircle, Bookmark, Activity, Sun, Wind } from 'lucide-react';
import '../css/HeroSection.css';

export default function HeroSection() {
  const [todos, setTodos] = useState([
    { id: 1, text: '비료 살포', completed: true },
    { id: 2, text: '작물 상태 점검', completed: true },
    { id: 3, text: '드론 배터리 충전', completed: true },
  ]);

  const toggleTodo = (id) => {
    setTodos(
      todos.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };
  
  const keywords = [
    { text: '병충해 관리', color: 'bg-red', icon: <Activity size={16} /> },
    { text: '작물 성장', color: 'bg-green', icon: <Activity size={16} /> },
    { text: '토양 상태', color: 'bg-amber', icon: <Sun size={16} /> },
    { text: '날씨 대응', color: 'bg-blue', icon: <Wind size={16} /> },
    { text: '수확 계획', color: 'bg-purple', icon: <Calendar size={16} /> },
  ];

  // 완료된 작업 비율 계산
  const completedRatio = todos.filter(t => t.completed).length / todos.length;
  const monthProgressPercent = 35; // 이번 달 진행률
  const todayProgressPercent = Math.round(completedRatio * 100);

  return (
    <div className="hero-section">
      {/* 상단 - 5월 핵심 키워드 */}
      <div className="keywords-section">
        <div className="section-header">
          <Bookmark /> 5월 핵심 키워드
        </div>
        
        <div className="keywords-container">
          {keywords.map((keyword, idx) => (
            <div 
              key={idx} 
              className={`keyword-badge ${keyword.color}`}
            >
              {keyword.icon}
              {keyword.text}
            </div>
          ))}
        </div>
        
        <div className="progress-section">
          <div className="progress-label">이번 달 진행 상황</div>
          <div className="progress-bar-bg">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${monthProgressPercent}%` }}
            ></div>
          </div>
          <p className="progress-text">{monthProgressPercent}% 완료</p>
        </div>
      </div>

      {/* 하단 - 오늘의 할 일 */}
      <div className="todos-section">
        <div className="todo-header">
          <div className="section-header">
            <CheckCircle /> 오늘의 할 일
          </div>
          
          <button className="add-todo-button">
            + 할 일 추가하기
          </button>
        </div>
        
        <div className="todos-list">
          {todos.map(todo => (
            <div 
              key={todo.id} 
              className="todo-item"
              onClick={() => toggleTodo(todo.id)}
            >
              <div className="todo-checkbox-wrapper">
                <input 
                  type="checkbox" 
                  id={`todo-checkbox-${todo.id}`}
                  className="todo-checkbox" 
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                />
                <label htmlFor={`todo-checkbox-${todo.id}`} className="todo-checkbox-label"></label>
              </div>
              <span className={`todo-text${todo.completed ? ' completed' : ''}`}>
                {todo.text}
              </span>
            </div>
          ))}
        </div>
        
        <div className="todo-footer">
          <span>완료: {todos.filter(t => t.completed).length}/{todos.length}</span>
          <span className="todo-progress">
            {todayProgressPercent}% 완료
          </span>
        </div>
      </div>
    </div>
  );
}