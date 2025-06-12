// src/components/HeroSection.js
import { useState, useEffect, useCallback } from 'react';
import { Calendar, CheckCircle, Bookmark, Activity, Sun, Wind, Trash2, Droplets, Scissors, Shield, Sprout, Truck, Eye } from 'lucide-react';
import AddTodoModal from './AddTodoModal';
import todoService from '../services/todoService';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDay, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import '../css/HeroSection.css';

// 키워드 매핑 테이블
const KEYWORD_MAPPING = {
  // 정확한 키워드 매칭
  "배추 묘 심기": { icon: <Sprout size={16} />, color: "bg-green" },
  "비료 시비": { icon: <Sun size={16} />, color: "bg-amber" },
  "잡초 제거": { icon: <Scissors size={16} />, color: "bg-orange" },
  "물관리": { icon: <Droplets size={16} />, color: "bg-blue" },
  "병충해 예방": { icon: <Shield size={16} />, color: "bg-red" },
  "병충해 관리": { icon: <Activity size={16} />, color: "bg-red" },
  "작물 성장": { icon: <Activity size={16} />, color: "bg-green" },
  "토양 상태": { icon: <Sun size={16} />, color: "bg-amber" },
  "날씨 대응": { icon: <Wind size={16} />, color: "bg-blue" },
  "수확 계획": { icon: <Calendar size={16} />, color: "bg-purple" },
};

// 부분 일치 매핑 (포함 키워드 기반)
const PARTIAL_KEYWORD_MAPPING = [
  // 파종/심기 관련
  { keywords: ["심기", "파종", "정식", "모종"], icon: <Sprout size={16} />, color: "bg-green" },
  
  // 비료/영양 관련
  { keywords: ["비료", "시비", "거름", "영양"], icon: <Sun size={16} />, color: "bg-amber" },
  
  // 잡초/제거 관련
  { keywords: ["잡초", "제거", "방제", "정리"], icon: <Scissors size={16} />, color: "bg-orange" },
  
  // 물/관수 관련
  { keywords: ["물", "관수", "급수", "물주기", "관리"], icon: <Droplets size={16} />, color: "bg-blue" },
  
  // 병충해 관련
  { keywords: ["병충해", "해충", "질병", "방제", "예방"], icon: <Shield size={16} />, color: "bg-red" },
  
  // 수확 관련
  { keywords: ["수확", "채취", "출하"], icon: <Truck size={16} />, color: "bg-purple" },
  
  // 관찰/점검 관련
  { keywords: ["점검", "관찰", "모니터링", "확인"], icon: <Eye size={16} />, color: "bg-gray" },
];

// 기본값
const DEFAULT_KEYWORD_STYLE = {
  icon: <Activity size={16} />,
  color: "bg-gray"
};

/**
 * 키워드 문자열을 받아서 해당하는 아이콘과 색상을 반환하는 함수
 */
function getKeywordStyle(keyword) {
  if (!keyword || typeof keyword !== 'string') {
    return DEFAULT_KEYWORD_STYLE;
  }

  // 1. 정확한 키워드 매칭 시도
  if (KEYWORD_MAPPING[keyword]) {
    return KEYWORD_MAPPING[keyword];
  }

  // 2. 부분 일치 매핑 시도
  for (const mapping of PARTIAL_KEYWORD_MAPPING) {
    if (mapping.keywords.some(k => keyword.includes(k))) {
      return {
        icon: mapping.icon,
        color: mapping.color
      };
    }
  }

  // 3. 매칭되지 않으면 기본값 반환
  return DEFAULT_KEYWORD_STYLE;
}

/**
 * API에서 받은 키워드 배열을 UI용 키워드 객체 배열로 변환
 */
function formatKeywordsForUI(monthlyKeywords) {
  if (!Array.isArray(monthlyKeywords)) {
    return [];
  }

  return monthlyKeywords.map(item => {
    const keyword = item.keyword || '';
    const style = getKeywordStyle(keyword);
    
    return {
      text: keyword,
      icon: style.icon,
      color: style.color
    };
  });
}

export default function HeroSection(field) {
  const [todos, setTodos] = useState([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [loadingId, setLoadingId] = useState(null); // 체크 버튼 로딩 표시
  const [addLoading, setAddLoading] = useState(false);
  
  // 월간 키워드와 진행도 상태 추가
  const [monthlyKeywords, setMonthlyKeywords] = useState([]);
  const [monthProgress, setMonthProgress] = useState(0);
  const [loadingKeywords, setLoadingKeywords] = useState(false);

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

  // 오늘 정보 및 월간 데이터 로드
  useEffect(() => {
    const fetchTodayInfo = async () => {
      setLoadingKeywords(true);
      try {
        // sessionStorage에서 fieldId 가져오기 (또는 props나 context에서)
        const fieldId = field?.field_id || sessionStorage.getItem('main_field');
        if (!fieldId) {
          throw new Error('필드 정보가 없습니다.');
        }

        // todoService의 todayinfo API 사용
        const data = await todoService.todayinfo(fieldId, today);
        console.log('오늘 정보:', data);
        // 키워드 데이터 처리
        if (data.monthly_keywords) {
          const formattedKeywords = formatKeywordsForUI(data.monthly_keywords);
          setMonthlyKeywords(formattedKeywords);
        }
      } catch (error) {
        console.error('오늘 정보 로드 실패:', error);
        // 실패 시 기본값 사용
        setMonthlyKeywords(formatKeywordsForUI([
          { keyword: "배추 묘 심기" },
          { keyword: "비료 시비" },
          { keyword: "잡초 제거" },
          { keyword: "물관리" },
          { keyword: "병충해 예방" }
        ]));
        setMonthProgress(0);
      } finally {
        setLoadingKeywords(false);
      }
    };

    fetchTodayInfo();
  }, [today]);

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
        window.dispatchEvent(new Event('todayTodosUpdated')); // 기존 이벤트
        // 삭제 전용 이벤트 추가
        window.dispatchEvent(new CustomEvent('todoDeleted', { detail: { id } }));
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
      console.log('새로 추가된 할 일:', todoItem);
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

  // 오늘 할 일 완료율 계산
  const total = todos.length;
  const completed = todos.filter(t => isCompleted(t)).length;
  const todayProgressPercent = total ? Math.round((completed / total) * 100) : 0;

  return (
    <>
      <div className="hero-section">
        {/* 상단 - 월간 핵심 키워드 */}
        <div className="keywords-section">
          <div className="section-header">
            <Bookmark /> {moment().format('M')}월 핵심 키워드
          </div>
          
          {loadingKeywords ? (
            <div className="keywords-container">
              <div className="loading-message">키워드를 불러오는 중...</div>
            </div>
          ) : (
            <div className="keywords-container">
              {monthlyKeywords.map((keyword, idx) => (
                <div key={idx} className={`keyword-badge ${keyword.color}`}>
                  {keyword.icon}
                  {keyword.text}
                </div>
              ))}
            </div>
          )}
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