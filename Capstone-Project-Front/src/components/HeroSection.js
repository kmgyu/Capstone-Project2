// src/components/HeroSection.js
import { useState, useEffect, useCallback } from 'react';
import { Calendar, CheckCircle, Bookmark, Activity, Sun, Wind, Trash2 } from 'lucide-react';
import AddTodoModal from './AddTodoModal';
import todoService from '../services/todoService';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDay, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import '../css/HeroSection.css';

export default function HeroSection() {
  const [todos, setTodos] = useState([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [loadingId, setLoadingId] = useState(null); // 체크 버튼 로딩 표시
  const [addLoading, setAddLoading] = useState(false);

  // 오늘 날짜(YYYY-MM-DD)
  const today = moment().format('YYYY-MM-DD');

  // 세션스토리지에서 불러오기(서버에서 변환한 구조 그대로)
  useEffect(() => {
    const stored = sessionStorage.getItem('todayTodos');
    if (stored) setTodos(JSON.parse(stored));
  }, []);

  useEffect(() => {
    const updateTodosFromSession = () => {
      const stored = sessionStorage.getItem('todayTodos');
      if (stored) setTodos(JSON.parse(stored));
      else setTodos([]);
    };

    updateTodosFromSession(); // 최초 실행
    window.addEventListener('todayTodosUpdated', updateTodosFromSession);

    return () => {
      window.removeEventListener('todayTodosUpdated', updateTodosFromSession);
    };
  }, []);

  // 완료 상태(오늘) progresses에서 status === 'done'
  const isCompleted = useCallback(
    (todo) => Array.isArray(todo.progresses) && 
      todo.progresses.some(p => p.date === today && p.status === 'done'),
    [today]
  );

  // 체크/토글(오늘 날짜 기준) - progresses + 서버 동기화
  const toggleTodo = async (id) => {
    const target = todos.find(t => t.id === id);
    if (!target) return;

    let progresses = Array.isArray(target.progresses) ? [...target.progresses] : [];
    const idx = progresses.findIndex(p => p.date === today);

    let newStatus;
    if (idx !== -1) {
      newStatus = progresses[idx].status === 'done' ? 'skip' : 'done';
      progresses[idx] = { ...progresses[idx], status: newStatus };
    } else {
      newStatus = 'done';
      progresses.push({ date: today, status: newStatus });
    }

    setLoadingId(id);

    try {
      // 서버에 진행도 업데이트 요청 (API는 progresses: [{ date, status }] 배열을 받음)
      await todoService.updateProgress(id, [{ date: today, status: newStatus }]);

      // 성공 시 프론트/세션스토리지 업데이트
      setTodos(prevTodos => {
        const updatedTodos = prevTodos.map(todo =>
          todo.id === id ? { ...todo, progresses } : todo
        );
        sessionStorage.setItem('todayTodos', JSON.stringify(updatedTodos));
        window.dispatchEvent(new Event('todayTodosUpdated'));
        return updatedTodos;
      });
    } catch (e) {
      alert('서버와의 연결에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setLoadingId(null);
    }
  };

  // 오늘 할 일 삭제 (API 연동)
  const deleteTodo = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    setLoadingId(id);
    try {
      console.log(`할 일 ${id} 삭제 요청`);
      await todoService.deleteTodo(id);
      setTodos((prevTodos) => {
        const updatedTodos = prevTodos.filter((todo) => todo.id !== id);
        sessionStorage.setItem('todayTodos', JSON.stringify(updatedTodos));
        window.dispatchEvent(new Event('todayTodosUpdated')); // 캘린더 등 갱신
        return updatedTodos;
      });
    } catch (e) {
      alert('삭제에 실패했습니다.');
    } finally {
      setLoadingId(null);
      console.log(1)
    }
  };

  // 할일 추가 모달 열기/닫기
  const openAddModal = () => setAddModalOpen(true);
  const closeAddModal = () => setAddModalOpen(false);

  // 새 할일 추가 (백엔드 연동)
  const handleAddTodo = async (newTodo) => {
    setAddLoading(true);
    try {
      // 1. 서버에 새 일정 등록
      const backendTodoData = {
        task_name: newTodo.task_name || newTodo.text,
        task_content: newTodo.task_content || '',
        start_date: newTodo.start_date || today,
        period: 1,
      };
      // 반드시 fieldId가 있어야 함 (없으면 오류)
      const fieldId = newTodo.field_id || (newTodo.field && newTodo.field.id) || null;
      if (!fieldId) throw new Error('필드 정보가 필요합니다.');

      // 서버에 등록
      const created = await todoService.createTodo(fieldId, backendTodoData);

      // 캘린더용 포맷 변환
      const [todoItem] = todoService.formatTodosForCalendar([created]);
      if (!todoItem) throw new Error('응답 데이터 변환 실패');

      setTodos(prevTodos => {
        const updated = [...prevTodos, todoItem];
        sessionStorage.setItem('todayTodos', JSON.stringify(updated));
        window.dispatchEvent(new Event('todayTodosUpdated'));
        return updated;
      });
      closeAddModal();
    } catch (e) {
      alert('일정 추가 실패: ' + (e.message || '서버 오류'));
      closeAddModal();
    } finally {
      setAddLoading(false);
    }
  };

  // 키워드
  const keywords = [
    { text: '병충해 관리', color: 'bg-red', icon: <Activity size={16} /> },
    { text: '작물 성장', color: 'bg-green', icon: <Activity size={16} /> },
    { text: '토양 상태', color: 'bg-amber', icon: <Sun size={16} /> },
    { text: '날씨 대응', color: 'bg-blue', icon: <Wind size={16} /> },
    { text: '수확 계획', color: 'bg-purple', icon: <Calendar size={16} /> },
  ];

  // 오늘 할 일 완료율 계산
  const total = todos.length;
  const completed = todos.filter(t => isCompleted(t)).length;
  const todayProgressPercent = total ? Math.round((completed / total) * 100) : 0;
  const monthProgressPercent = 35; // 예시

  return (
    <>
      <div className="hero-section">
        {/* 상단 - 5월 핵심 키워드 */}
        <div className="keywords-section">
          <div className="section-header">
            <Bookmark /> 5월 핵심 키워드
          </div>
          <div className="keywords-container">
            {keywords.map((keyword, idx) => (
              <div key={idx} className={`keyword-badge ${keyword.color}`}>
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
              <CheckCircle /> 오늘의 일정
            </div>
            <button className="add-todo-button" onClick={openAddModal} disabled={addLoading}>
              {addLoading ? '추가 중...' : '+ 일정 추가'}
            </button>
          </div>

          <div className="todos-list">
            {todos.length === 0 ? (
              <div className="no-todos">
                <p>오늘 예정된 일정이 없습니다.</p>
                <p className="add-todo-prompt">새로운 일정을 추가해보세요!</p>
              </div>
            ) : (
              todos.map(todo => (
                <div
                  key={todo.id}
                  className={`todo-item${isCompleted(todo) ? ' completed' : ''}`}
                  onClick={() => toggleTodo(todo.id)}
                  style={{ borderLeft: `4px solid ${todo.color || '#4CAF50'}` }}
                >
                  <div className="todo-checkbox-wrapper">
                    <input
                      type="checkbox"
                      id={`todo-checkbox-${todo.id}`}
                      className="todo-checkbox"
                      checked={!!isCompleted(todo)}
                      onChange={() => toggleTodo(todo.id)}
                      disabled={loadingId === todo.id}
                      onClick={e => e.stopPropagation()}
                    />
                    <label htmlFor={`todo-checkbox-${todo.id}`} className="todo-checkbox-label"></label>
                  </div>
                  <div className="todo-content">
                    <span className="todo-text">
                      {todo.title}
                    </span>
                    {todo.content && <p className="todo-detail">{todo.content}</p>}
                    <button
                      className="todo-delete"
                      onClick={(e) => {
                        e.stopPropagation();    
                        deleteTodo(todo.id);
                      }}
                      disabled={loadingId === todo.id}
                      style={{
                        marginLeft: "auto",   
                        height: '1em' , 
                        color: 'red',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="todo-footer">
            <span>완료: {completed}/{total}</span>
            <span className="todo-progress">
              {todayProgressPercent}% 완료
            </span>
          </div>
        </div>
      </div>

      {/* 할일 추가 모달 */}
      {addModalOpen && (
        <AddTodoModal
          isOpen={addModalOpen}
          onClose={closeAddModal}
          date={today}
          onAddTodo={handleAddTodo}
        />
      )}
    </>
  );
}
