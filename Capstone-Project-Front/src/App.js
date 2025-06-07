// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import Dashboard from './components/Dashboard';
import Slider from './components/Slider';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import Modal from './components/Modal';
import FarmlandManagement from './components/FarmlandManagement';
import Calendar from './components/Calendar';
import TodoModal from './components/TodoModal';
import todoService from './services/todoService'; // Todo API 서비스
import DroneView from './components/DroneView'; // 드론 뷰 컴포넌트
import './css/App.css';
import './css/AuthStyles.css';
import authService from './services/authService';
import fieldService from './services/fieldService'; // 필드 API 서비스
import PestDiseaseMap from './components/PestDiseaseMap';
import farmlandService from './services/farmlandService';
// Router hooks를 사용하는 별도의 컴포넌트
function AppRoutes() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  
  // Todo 관련 상태
  const [todos, setTodos] = useState([]);
  const [filteredTodos, setFilteredTodos] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [todoModalOpen, setTodoModalOpen] = useState(false);
  const [currentField, setCurrentField] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 이제 Router hooks를 Router 컨텍스트 내에서 안전하게 사용할 수 있습니다
  const location = useLocation();
  const navigate = useNavigate();

  // 페이지 로드 시 인증 상태 확인
  useEffect(() => {
    const checkAuthAndLoadFields = async () => {
      console.log('페이지 로드 시 토큰 확인');
      const token = sessionStorage.getItem('token');
      if (token) {
        console.log('토큰 확인');
        setIsAuthenticated(true);

        const userString = sessionStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        setUserData(user);

        const mainField = sessionStorage.getItem('main_field');
        if (!mainField) {
          console.log('필드확인');
          try {
            const field_all = await fieldService.getAllFields();
            if (field_all && field_all.length > 0) {
              sessionStorage.setItem('main_field', field_all[0].field_id);
              sessionStorage.setItem('field_all', JSON.stringify(field_all));
            } else {
              console.warn('받은 농지 목록이 비어 있습니다.');
            }
          } catch (error) {
            console.error('농지 목록 불러오기 실패:', error);
          }
        }
      }
    };

    checkAuthAndLoadFields();
  }, [isAuthenticated]);

  // 인증 상태가 변경될 때 Todo 데이터 로드
  useEffect(() => {
    if (isAuthenticated && userData) {
      loadTodoData();
      loadFieldsData();
    }
  }, [isAuthenticated, userData]);

  // Todo 데이터 로드 함수 - 백엔드 API 연동
  const loadTodoData = async () => {
    if (!userData) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 사용자의 모든 Todo 가져오기
      const userTodos = await todoService.getUserTodos(userData.id);
      
      // 캘린더 표시를 위한 형식으로 변환
      const formattedTodos = todoService.formatTodosForCalendar(userTodos);
      setTodos(formattedTodos);
      
      // 필드가 선택되어 있으면 해당 필드의 Todo만 필터링
      if (currentField) {
        const fieldTodos = formattedTodos.filter(todo => todo.field === currentField);
        setFilteredTodos(fieldTodos);
      } else {
        setFilteredTodos(formattedTodos);
      }
    } catch (error) {
      console.error('Todo 데이터 로드 오류:', error);
      setError('일정을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  // 로그아웃 처리 함수
  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setIsAuthenticated(false);
    setUserData(null);
    setTodos([]);
    setFilteredTodos([]);
  };
  // 라우트 변경 시 토큰 검증
  useEffect(() => {
    const checkTokenValidity = async () => {
      // 로그인 페이지에서는 토큰 검증을 건너뜁니다
      if (location.pathname === '/login' || 
          location.pathname === '/register' || 
          location.pathname === '/forgot-password' ||
          location.pathname.startsWith('/reset-password')) {
        return;
      }
      
      // 토큰 검증 API 호출
      console.log('토큰 검증 요청');
      const result = await authService.verifyToken();
      if (!result.valid) {
        console.log('refreshToken 요청');
        const refreshResult = await authService.refreshAccessToken();
        if (refreshResult.success) {
          console.log('새로운 토큰으로 갱신됨:', refreshResult.access);
        } else {
          // 토큰 검증 실패 시 로그아웃 처리
          console.warn('토큰 검증 실패:', result.reason);
          handleLogout();
          navigate('/login');
        }
      }
    };

    checkTokenValidity();
  }, [location.pathname, navigate]);
  
  // 필드 데이터 로드 함수 - 실제 API 연동 필요
  const loadFieldsData = async () => {
    // 실제 구현에서는 API로 필드 목록을 가져와야 함
    // 임시 필드 데이터 - 백엔드 문서에 있는 필드 ID 사용
    setFields([
      { id: 22, name: '딸기밭' },
      { id: 23, name: '배추밭' }
    ]);
    
    // 기본 필드 설정
    if (!currentField) {
      setCurrentField(22); // 첫 번째 필드를 기본값으로 설정
    }
  };
  
  // 로그인 처리 함수
  const handleLogin = (token, user, rememberMe) => {
    const { access, refresh } = token;
    if (rememberMe) {
      // localStorage.setItem('user', JSON.stringify(user));
    }
    sessionStorage.setItem('token', access);
    sessionStorage.setItem('refreshToken', refresh);
    sessionStorage.setItem('user', JSON.stringify(user));
    sessionStorage.setItem('username', user.username);
    

    setIsAuthenticated(true);
    setUserData(user);
  };

  

  // 월이 변경될 때 호출되는 함수 - 모든 데이터 다시 불러오기
  const handleMonthChange = async (year, month) => {
    // 월이 변경되어도 전체 데이터를 다시 불러오기
    if (isAuthenticated && userData) {
      await loadTodoData();
    }
  };
  
  // 날짜 선택 처리
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setTodoModalOpen(true);
  };
  
  // 모달 닫기
  const handleCloseTodoModal = () => {
    setTodoModalOpen(false);
  };
  
  // 특정 날짜의 Todo 필터링
  const getTodosForSelectedDate = () => {
    if (!selectedDate) return [];
    
    return filteredTodos.filter(todo => {
      const todoStartDate = new Date(todo.start);
      const todoEndDate = new Date(todo.end);
      const selected = new Date(selectedDate);
      
      // 날짜만 비교 (시간 무시)
      todoStartDate.setHours(0, 0, 0, 0);
      todoEndDate.setHours(0, 0, 0, 0);
      selected.setHours(0, 0, 0, 0);
      
      return selected >= todoStartDate && selected <= todoEndDate;
    });
  };
  
  // Todo 추가 - 백엔드 API 연동
  const handleAddTodo = async (todoData) => {
    if (!currentField) {
      alert('먼저 필드를 선택해주세요.');
      return;
    }
    
    try {
      setLoading(true);
      
      // 백엔드 형식에 맞게 데이터 변환
      const backendTodoData = {
        task_name: todoData.title,
        task_content: todoData.content || todoData.title,
        cycle: 7, // 기본값
        start_date: new Date(todoData.start).toISOString(),
        period: parseInt(todoData.period) || 1, // 작업 기간
        is_pest: todoData.type === 'pest' // 농사 작업/병충해 구분
      };
      
      // 새 Todo 생성 API 호출
      const newTodo = await todoService.createTodo(currentField, backendTodoData);
      
      // 캘린더용으로 형식 변환
      const formattedNewTodo = todoService.formatTodosForCalendar([newTodo])[0];
      
      // 상태 업데이트
      setTodos(prevTodos => [...prevTodos, formattedNewTodo]);
      
      // 현재 필드에 맞게 필터링된 할일도 업데이트
      if (formattedNewTodo.field === currentField) {
        setFilteredTodos(prevTodos => [...prevTodos, formattedNewTodo]);
      }
      
      // 모달 닫기
      setTodoModalOpen(false);
      
    } catch (error) {
      console.error('Todo 추가 오류:', error);
      alert('할 일을 추가하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  // Todo 삭제 - 백엔드 API 연동
  const handleDeleteTodo = async (todoId) => {
    try {
      setLoading(true);
      // 백엔드 API 호출
      await todoService.deleteTodo(todoId);
      
      // 상태에서 제거
      setTodos(prevTodos => prevTodos.filter(todo => todo.id !== todoId));
      setFilteredTodos(prevTodos => prevTodos.filter(todo => todo.id !== todoId));
      
    } catch (error) {
      console.error('Todo 삭제 오류:', error);
      alert('할 일을 삭제하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  // Todo 완료 상태 토글 - 로컬에서만 처리 (백엔드에 API가 없음)
  const handleToggleComplete = (todoId) => {
    // 로컬 상태만 업데이트 (백엔드 API에 완료 상태 변경 기능이 없음)
    setTodos(prevTodos => 
      prevTodos.map(todo => 
        todo.id === todoId 
          ? { ...todo, completed: !todo.completed }
          : todo
      )
    );
    
    setFilteredTodos(prevTodos => 
      prevTodos.map(todo => 
        todo.id === todoId 
          ? { ...todo, completed: !todo.completed }
          : todo
      )
    );
  };
  
  // 필드 변경 처리 - 백엔드에서 특정 필드의 Todo 가져오기
  const handleFieldChange = async (fieldId) => {
    setCurrentField(fieldId);
    setLoading(true);
    
    try {
      // 필드 ID가 있으면 해당 필드의 Todo만 가져오기
      if (fieldId) {
        const fieldTodos = await todoService.getFieldTodos(fieldId);
        const formattedTodos = todoService.formatTodosForCalendar(fieldTodos);
        setFilteredTodos(formattedTodos);
      } else {
        // 필드가 선택되지 않았으면 모든 Todo 표시
        setFilteredTodos(todos);
      }
    } catch (error) {
      console.error('필드 Todo 가져오기 오류:', error);
      setError('필드 일정을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Todo 캘린더 컴포넌트
  const TodoCalendarComponent = () => (
    <div className="calendar-container">
      <div className="field-selector">
        <label htmlFor="field-select">필드 선택:</label>
        <select 
          id="field-select" 
          value={currentField || ''}
          onChange={(e) => handleFieldChange(Number(e.target.value) || null)}
        >
          <option value="">전체 필드</option>
          {fields.map(field => (
            <option key={field.id} value={field.id}>
              {field.name}
            </option>
          ))}
        </select>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading">로딩 중...</div>
      ) : (
        <Calendar 
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          schedules={filteredTodos}
          onMonthChange={handleMonthChange}
        />
      )}
      
      {todoModalOpen && (
        <TodoModal 
          isOpen={todoModalOpen}
          onClose={handleCloseTodoModal}
          date={selectedDate}
          todos={getTodosForSelectedDate()}
          onAddTodo={handleAddTodo}
          onDeleteTodo={handleDeleteTodo}
          onToggleComplete={handleToggleComplete}
        />
      )}
    </div>
  );

  // 메인 홈페이지 컴포넌트
  const HomePage = () => (
    <>
      <Header onLogout={handleLogout} />
      <div className={`app-container ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="main-content">
          <div className="container">
            <HeroSection />
            <Dashboard />
            <PestDiseaseMap />
          </div>
        </main>
      </div>
      <Footer />
    </>
  );

  // 노지 관리 페이지 컴포넌트 
  const FarmlandPage = () => (
    <>
      <Header onLogout={handleLogout} />
      <div className={`app-container ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="main-content">
          <div className="container">
            <FarmlandManagement />
          </div>
        </main>
      </div>
      <Footer />
    </>
  );


  // 드론 페이지 컴포넌트
  const DronePage = () => (
    <>
      <Header onLogout={handleLogout} />
      <div className={`app-container ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="main-content">
          <div className="container">
            <div className="farmland-management">
              {/* <h1 className="page-title">드론 상태 모니터링</h1> */}
              <DroneView />
              <Slider />
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
  function FarmlandDetailPage() {
    const { field_id } = useParams();
    const [field, setField] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      async function fetchField() {
        setLoading(true);
        const result = await farmlandService.getFieldById(field_id);
        if (result.success) setField(result.data);
        setLoading(false);
      }
      fetchField();
    }, [field_id]);

    if (loading) return <div style={{ textAlign: 'center' }}>로딩 중...</div>;
    if (!field) return <div style={{ textAlign: 'center' }}>노지 정보를 찾을 수 없습니다.</div>;

    // 기존 홈페이지 구조와 동일, field만 prop으로 내려줌
    return (
      <>
        <Header onLogout={handleLogout} field={field} />
        <div className={`app-container ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
          <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="main-content">
            <div className="container">
              <HeroSection field={field} />
              <Dashboard field={field} />
              <PestDiseaseMap field={field} />
            </div>
          </main>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <Routes>
      {/* 인증 관련 라우트 */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Login onLogin={handleLogin} />
          )
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Register onRegister={handleLogin} />
          )
        }
      />
      <Route
        path="/forgot-password"
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <ForgotPassword />
          )
        }
      />
      <Route
        path="/reset-password/:token"
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <ResetPassword />
          )
        }
      />
      <Route
        path="/farmland/:field_id"
        element={
          isAuthenticated ? 
          <FarmlandDetailPage /> : <Navigate to="/login" replace /> }
      />

      {/* 보호된 라우트 */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <HomePage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      
      {/* 노지 관리 페이지 라우트 */}
      <Route
        path="/farmland"
        element={
          isAuthenticated ? (
            <FarmlandPage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      
      <Route
        path="/droneview"
        element={
          isAuthenticated ? (
            <DronePage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      {/* 그 외 경로는 홈으로 리다이렉트 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// 메인 App 컴포넌트 - Router와 전체 App 감싸기
function App() {
  
  return (
    <Router>
      <div className="App">
        <AppRoutes />
      </div>
    </Router>
  );
}

export default App;