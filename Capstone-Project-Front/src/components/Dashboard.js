// src/components/Dashboard.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Calendar from './Calendar';
import TodoModal from './TodoModal';
import todoService from '../services/todoService';
import '../css/Dashboard.css';
import moment from 'moment';
import 'moment/locale/ko';

const Dashboard = ({ field }) => {
  // 상태 관리
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [schedules, setSchedules] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentYearMonth, setCurrentYearMonth] = useState(moment().format('YYYY-MM'));
  const previousYearMonth = useRef('');
  
  // 사용자 ID (실제로는 로그인 상태에서 가져와야 함)
  const userString = sessionStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const userId = user?.id;
  
  // 데이터 로드 함수 (field prop에 따라 분기)
  const loadSchedules = useCallback(async (start, end) => {
    console.log('일정 데이터 로드:', start, end);
    setLoading(true);
    setError(null);

    try {
      let userTodos;
      if (field && field.field_id) {
        // field prop이 있으면 해당 필드 일정만
        userTodos = await todoService.getTodos(field.field_id, start, end);
      } else {
        // 없으면 전체 일정
        userTodos = await todoService.getAllTodos(start, end);
      }
      console.log('원본 데이터', userTodos);
      const formattedTodos = todoService.formatTodosForCalendar(userTodos);
      console.log('형식 변환된 일정:', formattedTodos);
      setSchedules(formattedTodos);
      filterSchedulesByDate(formattedTodos, selectedDate);
    } catch (error) {
      console.error('일정 데이터 로드 오류:', error);
      setError('일정을 불러오는 중 오류가 발생했습니다.');
      setSchedules([]);
      setFilteredSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, field]);
  
  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    const [year, month] = currentYearMonth.split('-').map(Number);
    const now = moment([year, month - 1]);

    const firstDate = now.clone().startOf('month').startOf('week').format('YYYY-MM-DD');
    const lastDate = now.clone().endOf('month').endOf('week').format('YYYY-MM-DD');

    setStartDate(firstDate);
    setEndDate(lastDate);

    loadSchedules(firstDate, lastDate);
  }, [currentYearMonth, loadSchedules]); // currentYearMonth를 의존성 배열로 관리
    
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
  
  // 월 변경 핸들러 (Calendar에서 호출)
  const handleMonthChange = useCallback((year, month) => {
    console.log(`월 변경됨: ${year}-${month}`);
    const formattedMonth = month.toString().padStart(2, '0');
    const newYearMonth = `${year}-${formattedMonth}`;

    setCurrentYearMonth(newYearMonth);
  }, []);
  
  // 이전 달로 이동 핸들러 (Calendar에서 호출)
  const handlePrevMonth = useCallback(() => {
    console.log("이전 달로 이동");
    setCurrentYearMonth(moment(currentYearMonth, 'YYYY-MM').subtract(1, 'month').format('YYYY-MM'));
  }, [currentYearMonth]);
  
  // 다음 달로 이동 핸들러 (Calendar에서 호출)
  const handleNextMonth = useCallback(() => {
    console.log("다음 달로 이동");
    setCurrentYearMonth(moment(currentYearMonth, 'YYYY-MM').add(1, 'month').format('YYYY-MM'));
  }, [currentYearMonth]);
  
  // 일정 추가 핸들러
  const addSchedule = useCallback(async (newScheduleData) => {
    try {
      setLoading(true);
      // 필드 ID는 예시로 첫 번째 필드 사용 (실제로는 선택된 필드 ID 사용)
      // 백엔드 문서에 있는 필드 ID 사용
      const fieldId = field && field.field_id ? field.field_id : newScheduleData.field_id;
      const backendTodoData = {
        task_name: newScheduleData.task_name,
        task_content: newScheduleData.task_content || newScheduleData.task_name,
        start_date: newScheduleData.start_date,
        period: parseInt(newScheduleData.period) || 1,
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
  }, [schedules, selectedDate, field]);
  
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
  
  // 일정 완료 상태 변경 
  const toggleScheduleComplete = useCallback(async (id, date) => {
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) return;

    const progressToUpdate = schedule.progresses.find(p => p.date === date);
    if (!progressToUpdate) {
      alert('해당 날짜의 진행 정보를 찾을 수 없습니다.');
      return;
    }

    const newStatus = progressToUpdate.status === 'done' ? 'skip' : 'done';

    try {
      setLoading(true);

      // ✅ 1. 서버에 진행도 업데이트 요청
      const updatedProgress = [{ date, status: newStatus }];
      await todoService.updateProgress(schedule.id, updatedProgress);

      // ✅ 2. 로컬 상태 업데이트
      const updatedSchedules = schedules.map(s => {
        if (s.id !== id) return { ...s };

        const updatedProgresses = s.progresses.map(p =>
          p.date === date ? { ...p, status: newStatus } : { ...p }
        );

        const isAnyDone = updatedProgresses.some(p => p.status === 'done');

        return { 
          ...s, 
          progresses: updatedProgresses,
          completed: isAnyDone
        };
      });

      setSchedules(updatedSchedules);
      filterSchedulesByDate(updatedSchedules, selectedDate);

    } catch (error) {
      console.error('진행도 업데이트 실패:', error);
      alert('일정 상태 변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
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
                onMonthChange={handleMonthChange}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                currentYearMonth={currentYearMonth}
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
