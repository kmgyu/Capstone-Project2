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
  const [currentYearMonth, setCurrentYearMonth] = useState(moment().format('YYYY-MM'));
  
  // 월별 데이터 캐시 - 이미 로드된 월의 데이터를 저장
  const monthlyDataCache = useRef(new Map());
  
  // 사용자 ID (실제로는 로그인 상태에서 가져와야 함)
  const userString = sessionStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const userId = user?.id;

  useEffect(() => {
    filterSchedulesByDate(schedules, selectedDate);
  }, [schedules, selectedDate]);

  useEffect(() => {
    const handleTodayTodosUpdated = () => {
      const todayTodos = JSON.parse(sessionStorage.getItem('todayTodos') || '[]');
      setSchedules(prevSchedules => {
        // 기존 일정(progresses만 업데이트)
        const updated = prevSchedules.map(sched => {
          const match = todayTodos.find(t => t.id === sched.id);
          if (match) {
            // progresses만 갱신 + completed 재계산
            const completed = Array.isArray(match.progresses) &&
              match.progresses.some(p => p.status === 'done');
            return { ...sched, progresses: match.progresses, completed };
          }
          return sched;
        });

        // 신규 일정 추가 (completed 계산해서)
        todayTodos.forEach(todayTodo => {
          const exists = updated.some(s => s.id === todayTodo.id);
          if (!exists) {
            const completed = Array.isArray(todayTodo.progresses) &&
              todayTodo.progresses.some(p => p.status === 'done');
            updated.push({ ...todayTodo, completed });
          }
        });

        return updated;
      });
    };

    window.addEventListener('todayTodosUpdated', handleTodayTodosUpdated);
    return () => window.removeEventListener('todayTodosUpdated', handleTodayTodosUpdated);
  }, []);
  // 세션 스토리지에 오늘의 할 일 저장하는 함수 (원본 데이터 그대로)
  const saveTodayTodosToSession = useCallback((allSchedules) => {
    const today = moment().format('YYYY-MM-DD');
    // 원본 일정 데이터에서 오늘에 해당하는 것들만 필터링
    const todayTodos = allSchedules.filter(schedule => {
      const start = moment(schedule.start);
      const end = moment(schedule.end);
      const selectedDay = moment(today);
      
      return selectedDay.isSameOrAfter(start, 'day') && selectedDay.isSameOrBefore(end, 'day');
    });
    
    sessionStorage.setItem('todayTodos', JSON.stringify(todayTodos));
  }, []);
  
  // 세션 스토리지에서 오늘의 할 일 가져오는 함수
  const getTodayTodosFromSession = useCallback(() => {
    try {
      const savedData = sessionStorage.getItem('todayTodos');
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error('세션 스토리지에서 오늘의 할 일을 가져오는 중 오류:', error);
    }
    return [];
  }, []);
  
  // 오늘의 할 일만 필터링하고 저장하는 함수
  const filterTodayTodos = useCallback((allSchedules) => {
    const today = moment().format('YYYY-MM-DD');
    // ✅ 구조 변환 없이 서버에서 받은 그대로 todayTodos로 저장
    const todayTodos = allSchedules.filter(schedule => {
      const start = moment(schedule.start);
      const end = moment(schedule.end);
      const selectedDay = moment(today);
      return selectedDay.isSameOrAfter(start, 'day') && selectedDay.isSameOrBefore(end, 'day');
    });
    sessionStorage.setItem('todayTodos', JSON.stringify(todayTodos));
    window.dispatchEvent(new Event('todayTodosUpdated'));
  }, []);
  
  // 캐시 키 생성 함수 (필드 ID와 년월을 조합)
  const getCacheKey = useCallback((yearMonth, fieldId = null) => {
    return fieldId ? `${fieldId}-${yearMonth}` : `all-${yearMonth}`;
  }, []);
  
  // 데이터 로드 함수 (캐싱 로직 추가)
  const loadSchedules = useCallback(async (yearMonth) => {
    const fieldId = field?.field_id;
    const cacheKey = getCacheKey(yearMonth, fieldId);
    
    // 캐시에서 데이터 확인
    if (monthlyDataCache.current.has(cacheKey)) {
      const cachedData = monthlyDataCache.current.get(cacheKey);
      setSchedules(cachedData);
      filterTodayTodos(cachedData);
      filterSchedulesByDate(cachedData, selectedDate);
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // 해당 월의 시작일과 종료일 계산 (캘린더 표시 범위 포함)
      const [year, month] = yearMonth.split('-').map(Number);
      const now = moment([year, month - 1]);
      const firstDate = now.clone().startOf('month').startOf('week').format('YYYY-MM-DD');
      const lastDate = now.clone().endOf('month').endOf('week').format('YYYY-MM-DD');

      let userTodos;
      if (fieldId) {
        // field prop이 있으면 해당 필드 일정만
        userTodos = await todoService.getTodos(fieldId, firstDate, lastDate);
      } else {
        // 없으면 전체 일정
        userTodos = await todoService.getAllTodos(firstDate, lastDate);
      }
      
      const formattedTodos = todoService.formatTodosForCalendar(userTodos);      
      // 캐시에 저장
      monthlyDataCache.current.set(cacheKey, formattedTodos);
      
      setSchedules(formattedTodos);
      
      // 오늘의 할 일 필터링 및 세션 스토리지 저장
      filterTodayTodos(formattedTodos);
      
      // 선택된 날짜의 일정 필터링
      filterSchedulesByDate(formattedTodos, selectedDate);
    } catch (error) {
      console.error('일정 데이터 로드 오류:', error);
      setError('일정을 불러오는 중 오류가 발생했습니다.');
      setSchedules([]);
      setFilteredSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, field, filterTodayTodos, getCacheKey]);
  
  // 컴포넌트 마운트 시 및 월 변경 시 데이터 로드
  useEffect(() => {
    loadSchedules(currentYearMonth);
  }, [currentYearMonth, loadSchedules]);
    
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
    const formattedMonth = month.toString().padStart(2, '0');
    const newYearMonth = `${year}-${formattedMonth}`;

    setCurrentYearMonth(newYearMonth);
  }, []);
  
  // 이전 달로 이동 핸들러 (Calendar에서 호출)
  const handlePrevMonth = useCallback(() => {
    setCurrentYearMonth(moment(currentYearMonth, 'YYYY-MM').subtract(1, 'month').format('YYYY-MM'));
  }, [currentYearMonth]);
  
  // 다음 달로 이동 핸들러 (Calendar에서 호출)
  const handleNextMonth = useCallback(() => {
    setCurrentYearMonth(moment(currentYearMonth, 'YYYY-MM').add(1, 'month').format('YYYY-MM'));
  }, [currentYearMonth]);
  
  // 캐시 무효화 함수 (일정이 추가/삭제/수정될 때 호출)
  const invalidateCache = useCallback((targetYearMonth = null) => {
    if (targetYearMonth) {
      // 특정 월의 캐시만 무효화
      const fieldId = field?.field_id;
      const cacheKey = getCacheKey(targetYearMonth, fieldId);
      monthlyDataCache.current.delete(cacheKey);
    } else {
      // 전체 캐시 무효화
      monthlyDataCache.current.clear();
    }
  }, [field, getCacheKey]);
  
  // 일정 추가 핸들러
  const addSchedule = useCallback(async (newScheduleData) => {
    try {
      setLoading(true);

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
      
      // 새 일정이 영향을 주는 월들의 캐시 무효화
      const startMonth = moment(formattedNewTodo.start).format('YYYY-MM');
      const endMonth = moment(formattedNewTodo.end).format('YYYY-MM');
      
      invalidateCache(startMonth);
      if (startMonth !== endMonth) {
        invalidateCache(endMonth);
      }
      
      // 현재 월 데이터 다시 로드
      await loadSchedules(currentYearMonth);
      
      // 모달 닫기
      setIsTodoModalOpen(false);
    } catch (error) {
      console.error('일정 추가 오류:', error);
      alert('일정을 추가하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [field, invalidateCache, loadSchedules, currentYearMonth]);
  
  // 일정 삭제 핸들러
  const deleteSchedule = useCallback(async (id) => {
    try {
      setLoading(true);
      
      // 삭제할 일정 정보 저장 (캐시 무효화를 위해)
      const scheduleToDelete = schedules.find(s => s.id === id);
      
      // API 호출로 삭제
      await todoService.deleteTodo(id);
      
      // 삭제된 일정이 영향을 주는 월들의 캐시 무효화
      if (scheduleToDelete) {
        const startMonth = moment(scheduleToDelete.start).format('YYYY-MM');
        const endMonth = moment(scheduleToDelete.end).format('YYYY-MM');
        
        invalidateCache(startMonth);
        if (startMonth !== endMonth) {
          invalidateCache(endMonth);
        }
      }
      
      // 현재 월 데이터 다시 로드
      await loadSchedules(currentYearMonth);
      
    } catch (error) {
      console.error('일정 삭제 오류:', error);
      alert('일정을 삭제하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [schedules, invalidateCache, loadSchedules, currentYearMonth]);
  
  // 일정 완료 상태 변경 
  // Dashboard.js의 toggleScheduleComplete 함수 수정 부분

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

      // ✅ 3. schedules 상태 업데이트
      setSchedules(updatedSchedules);

      // ✅ 4. **중요** filteredSchedules도 함께 업데이트
      const updatedFilteredSchedules = updatedSchedules.filter(schedule => {
        const start = moment(schedule.start);
        const end = moment(schedule.end);
        const selected = moment(selectedDate);
        return selected.isSameOrAfter(start, 'day') && selected.isSameOrBefore(end, 'day');
      });
      setFilteredSchedules(updatedFilteredSchedules);

      // ✅ 5. 캐시도 업데이트
      const fieldId = field?.field_id;
      const cacheKey = getCacheKey(currentYearMonth, fieldId);
      monthlyDataCache.current.set(cacheKey, updatedSchedules);

      // ✅ 6. 오늘의 할 일 업데이트 (HeroSection용)
      filterTodayTodos(updatedSchedules);

    } catch (error) {
      console.error('진행도 업데이트 실패:', error);
      alert('일정 상태 변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [schedules, selectedDate, filterTodayTodos, field, getCacheKey, currentYearMonth]);

  // 세션 스토리지의 오늘 할 일 데이터를 외부에서 접근할 수 있도록 하는 함수
  const getTodayTodosData = useCallback(() => {
    return getTodayTodosFromSession();
  }, [getTodayTodosFromSession]);

  // 컴포넌트가 마운트될 때 기존 세션 데이터 확인
  useEffect(() => {
    const existingTodayData = getTodayTodosFromSession();
    if (existingTodayData && existingTodayData.length > 0) {
    }
  }, [getTodayTodosFromSession]);

  // field prop이 변경될 때 캐시 무효화
  useEffect(() => {
    invalidateCache();
  }, [field?.field_id, invalidateCache]);
  
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