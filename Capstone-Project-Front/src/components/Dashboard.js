// src/components/Dashboard.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Calendar from './Calendar';
import TodoModal from './TodoModal';
import todoService from '../services/todoService';
import '../css/Dashboard.css';
import moment from 'moment';

const Dashboard = () => {
  // 상태 관리
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [schedules, setSchedules] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const previousYearMonth = useRef('');
  
  // 사용자 ID (실제로는 로그인 상태에서 가져와야 함)
  const userString = sessionStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const userId = user?.id;
  
  // 데이터 로드 함수
  const loadSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 실제 API 호출
      const userTodos = await todoService.getUserTodos(userId);
      const formattedTodos = todoService.formatTodosForCalendar(userTodos);
      setSchedules(formattedTodos);
      
      // 선택된 날짜에 맞게 필터링
      filterSchedulesByDate(formattedTodos, selectedDate);
    } catch (error) {
      console.error('dashboard', error);
      console.error('일정 데이터 로드 오류:', error);
      setError('일정을 불러오는 중 오류가 발생했습니다.');
      setSchedules([]);
      setFilteredSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedDate]);
  
  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);
  
  // 날짜에 맞게 일정 필터링
  const filterSchedulesByDate = (allSchedules, date) => {
    const filtered = allSchedules.filter(schedule => {
      const start = moment(schedule.start);
      const end = moment(schedule.end);
      const selected = moment(date);
      
      // 선택된 날짜가 시작일과 종료일 사이에 있으면 true
      return selected.isSameOrAfter(start, 'day') && selected.isSameOrBefore(end, 'day');
    });
    
    setFilteredSchedules(filtered);
  };
  
  // 날짜 선택 핸들러
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    filterSchedulesByDate(schedules, date);
    setIsTodoModalOpen(true);
  };
  
  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setIsTodoModalOpen(false);
  };
  
  // 월 변경 핸들러
  const fetchMonthSchedules = useCallback(async (year, month) => {
    // 이전에 호출했던 연/월과 같으면 재호출 방지
    const yearMonthKey = `${year}-${month}`;
    if (previousYearMonth.current === yearMonthKey) return;
    previousYearMonth.current = yearMonthKey;
    
    // 데이터 다시 로드
    await loadSchedules();
  }, [loadSchedules]);
  
  // 일정 추가 핸들러
  const addSchedule = useCallback(async (newScheduleData) => {
    try {
      setLoading(true);
      
      // 필드 ID는 예시로 첫 번째 필드 사용 (실제로는 선택된 필드 ID 사용)
      const fieldId = 22; // 백엔드 문서에 있는 필드 ID 사용
      
      // 백엔드 형식에 맞게 데이터 변환
      const backendTodoData = {
        task_name: newScheduleData.title,
        task_content: newScheduleData.content || newScheduleData.title,
        cycle: 7, // 기본값
        start_date: new Date(newScheduleData.start).toISOString(),
        period: parseInt(newScheduleData.period) || 1, // 작업 기간
        is_pest: newScheduleData.type === 'pest' // 농사 작업/병충해 구분
      };
      
      // 새 Todo 생성 API 호출
      const newTodo = await todoService.createTodo(fieldId, backendTodoData);
      
      // 캘린더용으로 형식 변환
      const formattedNewTodo = todoService.formatTodosForCalendar([newTodo])[0];
      
      // 상태 업데이트
      setSchedules(prevSchedules => [...prevSchedules, formattedNewTodo]);
      
      // 필터링된 목록도 업데이트
      filterSchedulesByDate([...schedules, formattedNewTodo], selectedDate);
      
      // 모달 닫기
      setIsTodoModalOpen(false);
      
    } catch (error) {
      console.error('일정 추가 오류:', error);
      alert('일정을 추가하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [schedules, selectedDate]);
  
  // 일정 삭제 핸들러
  const deleteSchedule = useCallback(async (id) => {
    try {
      setLoading(true);
      
      // API 호출로 삭제
      await todoService.deleteTodo(id);
      
      // 상태 업데이트
      const updatedSchedules = schedules.filter(schedule => schedule.id !== id);
      setSchedules(updatedSchedules);
      
      // 필터링된 목록도 업데이트
      filterSchedulesByDate(updatedSchedules, selectedDate);
      
    } catch (error) {
      console.error('일정 삭제 오류:', error);
      alert('일정을 삭제하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [schedules, selectedDate]);
  
  // 일정 완료 상태 변경 - 백엔드에 해당 API가 없으므로 로컬에서만 처리
  const toggleScheduleComplete = useCallback((id) => {
    // 로컬 상태만 업데이트
    const updatedSchedules = schedules.map(schedule => 
      schedule.id === id ? { ...schedule, completed: !schedule.completed } : schedule
    );
    
    setSchedules(updatedSchedules);
    filterSchedulesByDate(updatedSchedules, selectedDate);
  }, [schedules, selectedDate]);
  
  return (
    <div className="dashboard">
      <div className="dashboard-section">
        <div className="dashboard-row">
          <div className="dashboard-card calendar-card">
            {error && <div className="error-message">{error}</div>}
            
            {loading ? (
              <div className="loading">일정을 불러오는 중...</div>
            ) : (
              <Calendar 
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                schedules={schedules}
                onMonthChange={fetchMonthSchedules}
              />
            )}
          </div>
          
          {/* TodoModal 컴포넌트 */}
          <TodoModal
            isOpen={isTodoModalOpen}
            onClose={handleCloseModal}
            date={selectedDate}
            todos={filteredSchedules}
            onAddTodo={addSchedule}
            onDeleteTodo={deleteSchedule}
            onToggleComplete={toggleScheduleComplete}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;