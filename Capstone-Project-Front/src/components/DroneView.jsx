import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import droneService from '../services/droneService';
import '../css/DroneView.css'; 

// Chart.js 컴포넌트 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const DroneView = () => {
  // 드론 목록 상태
  const [drones, setDrones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 현재 선택된 드론
  const [selectedDroneId, setSelectedDroneId] = useState(null);
  
  // 드론 등록 모달 상태
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({ name: '', serial_number: '' });
  const [registerLoading, setRegisterLoading] = useState(false);
  
  // 드론 편집 모달 상태
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', drone_id: null });
  const [editLoading, setEditLoading] = useState(false);
  
  // 현재 선택된 드론의 데이터
  const [droneData, setDroneData] = useState({
    gps: {
      latitude: 0,
      longitude: 0,
      altitude: 0,
      signal_strength: 0
    },
    battery: {
      percentage: 0,
    },
    status: {
      state: 'unknown',
      flying_time: 0,
    },
    errors: []
  });

  // 일별 체공 시간 데이터
  const [flightTimeData, setFlightTimeData] = useState({
    labels: [],
    datasets: [{
      label: '체공 시간 (분)',
      data: [],
      borderColor: '#4d8b31',
      backgroundColor: 'rgba(77, 139, 49, 0.2)',
      tension: 0.4
    }]
  });

  // 초기 드론 목록 로드
  useEffect(() => {
    loadDrones();
  }, []);

  // 선택된 드론 변경 시 상세 정보 로드
  useEffect(() => {
    console.log('useEffect 트리거됨 - selectedDroneId:', selectedDroneId); // 디버깅용
    if (selectedDroneId) {
      console.log('드론 상세 정보 로드 시작...'); // 디버깅용
      loadDroneDetails(selectedDroneId);
    } else {
      console.log('selectedDroneId가 없어서 로드하지 않음'); // 디버깅용
    }
  }, [selectedDroneId]);

  // 드론 ID 추출 함수 (다양한 ID 필드명 지원)
  const getDroneId = (drone) => {
    return drone.id || drone.drone_id || drone.droneId || drone.serial_number;
  };

  // 드론 목록 로드
  const loadDrones = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await droneService.getMyDrones();
      const droneList = response.drones || response || [];
      
      console.log('API 응답 원본:', response); // 디버깅용
      console.log('드론 목록 파싱:', droneList); // 디버깅용
      
      // 각 드론의 ID 필드를 확인
      droneList.forEach((drone, index) => {
        console.log(`드론 ${index}:`, drone);
        console.log(`드론 ${index} ID:`, getDroneId(drone));
      });
      
      setDrones(droneList);
      
      // 첫 번째 드론을 자동 선택 (기존에 선택된 드론이 없거나 목록에 없는 경우)
      if (droneList.length > 0) {
        const currentSelected = droneList.find(drone => getDroneId(drone) === selectedDroneId);
        if (!currentSelected) {
          const firstDroneId = getDroneId(droneList[0]);
          console.log('첫 번째 드론 자동 선택:', firstDroneId); // 디버깅용
          setSelectedDroneId(firstDroneId);
        }
      } else {
        setSelectedDroneId(null);
      }
    } catch (err) {
      console.error('드론 목록 로드 실패:', err);
      setError('드론 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 드론 상세 정보 로드
  const loadDroneDetails = async (droneId) => {
    console.log('=== loadDroneDetails 함수 시작 ===');
    console.log('요청할 드론 ID:', droneId);
    
    try {
      // 병렬로 여러 API 호출
      console.log('API 호출 시작...');
      const [
        batteryData,
        altitudeData,
        gpsData,
        locationHistoryData,
        flightStatusData,
        errorLogsData,
        dailyFlightData
      ] = await Promise.allSettled([
        droneService.getLogBattery(droneId),
        droneService.getLogAltitude(droneId),
        droneService.getLogGpsStrength(droneId),
        droneService.getLogLocationHistory(droneId),
        droneService.getFlightStatus(droneId),
        droneService.getErrorLogs(droneId),
        droneService.getDailyFlightTime(droneId)
      ]);

      console.log('API 호출 완료, 데이터 처리 시작...');
      console.log('Battery API 결과:', batteryData);
      console.log('GPS API 결과:', gpsData);
      console.log('Altitude API 결과:', altitudeData);
      console.log('Flight Status API 결과:', flightStatusData);


      // 배터리 데이터 처리
      let battery = { percentage: 0, voltage: 0, estimated_time: 0 };
      if (batteryData.status === 'fulfilled' && batteryData.value) {
        const latestBattery = Array.isArray(batteryData.value) ? 
          batteryData.value[batteryData.value.length - 1] : batteryData.value;
        console.log('최신 배터리 데이터:', latestBattery); // 디버깅용
        battery = {
          percentage: latestBattery.battery || 0,
        };
      }

      // GPS 데이터 처리
      let gps = { latitude: 0, longitude: 0, altitude: 0, signal_strength: 0 };
      if (gpsData.status === 'fulfilled' && gpsData.value) {
        const latestGps = Array.isArray(gpsData.value) ? 
          gpsData.value[gpsData.value.length - 1] : gpsData.value;
        gps.signal_strength = latestGps.gps_strength || 0;
      }
      
      if (altitudeData.status === 'fulfilled' && altitudeData.value) {
        const latestAltitude = Array.isArray(altitudeData.value) ? 
          altitudeData.value[altitudeData.value.length - 1] : altitudeData.value;
        console.log('최신 고도 데이터:', latestAltitude); // 디버깅용
        gps.altitude = latestAltitude.altitude || 0;
      }

      // 위도 경도 데이터 처리
      if (locationHistoryData.status === 'fulfilled' && locationHistoryData.value) {
        const latestLocation = Array.isArray(locationHistoryData.value) ?
          locationHistoryData.value[locationHistoryData.value.length - 1] : locationHistoryData.value;
        console.log('최신 위치 데이터:', latestLocation); // 디버깅용
        gps.latitude = latestLocation.latitude || 0;
        gps.longitude = latestLocation.longitude || 0;
      }

      // 비행 상태 데이터 처리
      let status = { state: 'unknown', flying_time: 0, motor_rpm: 0, temperature: 0 };
      if (flightStatusData.status === 'fulfilled' && flightStatusData.value) {
        const flightStatus = flightStatusData.value;
        console.log('비행 상태 데이터:', flightStatus); // 디버깅용
        console.log('비행 상태', flightStatus.status); // 디버깅용
        status = {
          state: flightStatus.status || 'unknown',
          flying_time: flightStatus.flight_time || 0
        };
      }

      // 에러 로그 처리
      let errors = [];
      if (errorLogsData.status === 'fulfilled' && errorLogsData.value) {
        errors = Array.isArray(errorLogsData.value) ? 
          errorLogsData.value.map(error => ({
            time: new Date(error.timestamp).toLocaleTimeString(),
            code: error.error_code || 'Unknown',
            message: error.error_message || error.message || '알 수 없는 오류'
          })) : [];
      }

      // 드론 데이터 업데이트
      console.log('최종 드론 데이터:', { gps, battery, status, errors });
      setDroneData({
        gps,
        battery,
        status,
        errors
      });
      console.log('드론 데이터 상태 업데이트 완료');

      // 일별 비행 시간 차트 데이터 처리
      if (dailyFlightData.status === 'fulfilled' && dailyFlightData.value) {
        const flightData = Array.isArray(dailyFlightData.value) ? dailyFlightData.value : [];
        console.log('!!!!!!!!!!!일별 비행 시간 데이터:', flightData); // 디버깅용
        const labels = flightData.map(item => {
          const date = new Date(item.date);
          console.log('날짜 변환:', item.date, '->', date); // 디버깅용
          return `${date.getMonth() + 1}/${date.getDate()}`;
        });
        const data = flightData.map(item => item.flight_time_min || 0);
        console.log('!!!!!!!!!!!!!!차트 레이블:', data); // 디버깅용
        setFlightTimeData({
          labels,
          datasets: [{
            label: '체공 시간 (분)',
            data,
            borderColor: '#4d8b31',
            backgroundColor: 'rgba(77, 139, 49, 0.2)',
            tension: 0.4
          }]
        });
      }

      console.log('=== loadDroneDetails 함수 완료 ===');

    } catch (err) {
      console.error('드론 상세 정보 로드 실패:', err);
      setError('드론 상세 정보를 불러오는데 실패했습니다.');
    }
  };

  // 드론 등록 핸들러
  const handleRegisterDrone = async () => {
    if (!registerForm.name.trim()) {
      alert('드론 이름을 입력해주세요.');
      return;
    }
    
    if (!registerForm.serial_number.trim()) {
      alert('시리얼 번호를 입력해주세요.');
      return;
    }

    try {
      setRegisterLoading(true);
      await droneService.claimDrone(registerForm.serial_number, registerForm.name);
      
      // 등록 성공 후 드론 목록 새로고침
      await loadDrones();
      
      setRegisterForm({ name: '', serial_number: '' });
      setShowRegisterModal(false);
      alert('드론이 성공적으로 등록되었습니다!');
    } catch (err) {
      console.error('드론 등록 실패:', err);
      alert(err.message || '드론 등록에 실패했습니다.');
    } finally {
      setRegisterLoading(false);
    }
  };

  // 드론 편집 모달열기
  const handleEditDrone = (drone) => {
    setEditForm({
      name: drone.name,
      drone_id: getDroneId(drone)
    });
    setShowEditModal(true);
  };

  // 드론 이름 수정 핸들러
  const handleUpdateDroneName = async () => {
    if (!editForm.name.trim()) {
      alert('드론 이름을 입력해주세요.');
      return;
    }

    try {
      setEditLoading(true);
      await droneService.updateDroneName(editForm.drone_id, editForm.name);
      
      // 수정 성공 후 드론 목록 새로고침
      await loadDrones();
      
      setShowEditModal(false);
      alert('드론 이름이 성공적으로 수정되었습니다!');
    } catch (err) {
      console.error('드론 이름 수정 실패:', err);
      alert(err.message || '드론 이름 수정에 실패했습니다.');
    } finally {
      setEditLoading(false);
    }
  };

  // 드론 삭제 핸들러
  const handleDeleteDrone = async () => {
    if (!window.confirm('정말로 이 드론을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      setEditLoading(true);
      await droneService.deleteDrone(editForm.drone_id);
      
      // 삭제된 드론이 현재 선택된 드론이면 선택 해제
      if (selectedDroneId === editForm.drone_id) {
        setSelectedDroneId(null);
      }
      
      // 삭제 성공 후 드론 목록 새로고침
      await loadDrones();
      
      setShowEditModal(false);
      alert('드론이 성공적으로 삭제되었습니다!');
    } catch (err) {
      console.error('드론 삭제 실패:', err);
      alert(err.message || '드론 삭제에 실패했습니다.');
    } finally {
      setEditLoading(false);
    }
  };

  // 드론 선택 핸들러
  const handleDroneSelect = async (droneId) => {
    console.log('드론 선택됨:', droneId); // 디버깅용
    console.log('현재 selectedDroneId:', selectedDroneId); // 디버깅용
    
    if (!droneId) {
      console.error('드론 ID가 없습니다!');
      return;
    }
    
    // 드론 데이터 초기화 (로딩 표시용)
    setDroneData({
      gps: { latitude: 0, longitude: 0, altitude: 0, signal_strength: 0 },
      battery: { percentage: 0 },
      status: { state: 'loading', flying_time: 0 },
      errors: []
    });
    
    // 선택된 드론 ID 업데이트
    setSelectedDroneId(droneId);
    console.log('setSelectedDroneId 호출 완료:', droneId); // 디버깅용
    
    // useEffect를 기다리지 않고 직접 데이터 로드
    console.log('직접 데이터 로드 시작'); // 디버깅용
    await loadDroneDetails(droneId);
  };

  // 배터리 상태에 따른 클래스 결정
  const getBatteryStatusClass = (percentage) => {
    if (percentage >= 70) return 'status-good';
    if (percentage >= 30) return 'status-warning';
    return 'status-critical';
  };

  // GPS 신호 강도 표시 함수 (1-6 범위)
  const getGpsSignalDisplay = (strength) => {
    const level = Math.round(strength);
    if (level >= 5) return { text: `${level}/6 (강함)`, class: 'signal-strong' };
    if (level >= 3) return { text: `${level}/6 (보통)`, class: 'signal-medium' };
    if (level >= 1) return { text: `${level}/6 (약함)`, class: 'signal-weak' };
    return { text: '0/6 (없음)', class: 'signal-none' };
  };

  // 드론 상태에 따른 표시 내용
  const getDroneStatusDisplay = (status) => {
    switch (status.toLowerCase()) {
      case '비행 중':
        return { text: '비행 중', class: 'status-active' };
      case '대기 중':
        return { text: '대기 중', class: 'status-standby' };
      default:
        return { text: '상태 미확인', class: 'status-unknown' };
    }
  };

  // 현재 선택된 드론 정보
  const selectedDrone = drones.find(drone => getDroneId(drone) === selectedDroneId);
  
  console.log('현재 선택된 드론 ID:', selectedDroneId); // 디버깅용
  console.log('현재 선택된 드론 객체:', selectedDrone); // 디버깅용

  // 차트 옵션
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: '일별 체공 시간',
        color: '#333',
        font: {
          size: 16
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '시간 (분)'
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="drone-view">
        <div className="loading-message">드론 정보를 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="drone-view">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={loadDrones}>다시 시도</button>
        </div>
      </div>
    );
  }

  return (
    <div className="drone-view">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <h1 className="page-title">드론 모니터링</h1>
        <button 
          className="register-btn"
          onClick={() => setShowRegisterModal(true)}
        >
          + 드론 등록
        </button>
      </div>

      {/* 드론이 없는 경우 */}
      {drones.length === 0 ? (
        <div className="no-drones-message">
          <p>등록된 드론이 없습니다.</p>
        </div>
      ) : (
        <>
          {/* 드론 선택 탭 */}
          <div className="drone-tabs">
            {drones.map((drone, index) => {
              const droneId = getDroneId(drone);
              return (
                <div
                  key={droneId || index}
                  className={`drone-tab ${selectedDroneId === droneId ? 'active' : ''}`}
                >
                  <div
                    className="drone-tab-content"
                    onClick={() => handleDroneSelect(droneId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    {/* 왼쪽: 이름, 상태, 시리얼 */}
                    <div>
                      <div className="drone-tab-info" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="drone-name">{drone.name}</span>
                        <span className={`drone-status-indicator ${selectedDroneId === droneId ? droneData.status.state : 'unknown'}`}></span>
                      </div>
                      <div className="drone-serial">{drone.serial_number}</div>
                    </div>
                    {/* 오른쪽: 연필 아이콘 */}
                    <button
                      className="edit-drone-btn"
                      onClick={e => {
                        e.stopPropagation();
                        handleEditDrone(drone);
                      }}
                      title="드론 편집"
                    >
                      ✏️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 선택된 드론 정보 표시 */}
          {selectedDrone && (
            <div className="selected-drone-info">
              <h2>현재 선택: {selectedDrone.name}</h2>
            </div>
          )}

          {/* 드론 상태 요약 정보 */}
          <div className="drone-status-overview">
            <div className={`status-card ${getDroneStatusDisplay(droneData.status.state).class}`}>
              <h3>비행 상태</h3>
              <div className="status-value">{getDroneStatusDisplay(droneData.status.state).text}</div>
              {/* <div className="status-detail">
                현재 비행 시간: {droneData.status.flying_time.toFixed(1)}분
              </div> */}
            </div>

            <div className={`status-card ${getBatteryStatusClass(droneData.battery.percentage)}`}>
              <h3>배터리</h3>
              <div className="battery-display">
                <div className="battery-percentage">{droneData.battery.percentage}%</div>
                <div className="battery-bar">
                  <div 
                    className="battery-level" 
                    style={{ width: `${droneData.battery.percentage}%` }}
                  ></div>
                </div>
              </div>
              {/* <div className="status-detail">
                잔여 시간: {droneData.battery.estimated_time.toFixed(1)}분
              </div> */}
            </div>

            <div className="status-card">
              <h3>GPS 상태</h3>
              <div className="status-value">
                신호 강도: {getGpsSignalDisplay(droneData.gps.signal_strength).text}
              </div>
              {/* <div className="status-detail">
                고도: {droneData.gps.altitude.toFixed(1)}m
              </div> */}
            </div>
          </div>
          
          {/* GPS 위치 정보 */}
          <div className="drone-detail-section">
            <h2 className="section-title">GPS 위치 정보</h2>
            <div className="gps-info">
              <div className="info-card">
                <h3>위도</h3>
                <div className="info-value">{droneData.gps.latitude.toFixed(4)}°</div>
              </div>
              <div className="info-card">
                <h3>경도</h3>
                <div className="info-value">{droneData.gps.longitude.toFixed(4)}°</div>
              </div>
              <div className="info-card">
                <h3>고도</h3>
                <div className="info-value">{droneData.gps.altitude.toFixed(1)}m</div>
              </div>
              <div className="info-card">
                <h3>GPS 신호</h3>
                <div className="info-value">{getGpsSignalDisplay(droneData.gps.signal_strength).text}</div>
              </div>
            </div>
          </div>

          {/* 일별 체공 시간 차트 */}
          <div className="chart-container">
            <h2 className="section-title">일별 체공 시간</h2>
            <div className="flight-time-chart">
              <Line data={flightTimeData} options={chartOptions} />
            </div>
          </div>

          {/* 오류 로그 */}
          <div className="drone-detail-section">
            <h2 className="section-title">오류 로그</h2>
            <div className="error-log">
              <table className="error-table">
                <thead>
                  <tr>
                    <th>시간</th>
                    {/* <th>코드</th> */}
                    <th>메시지</th>
                  </tr>
                </thead>
                <tbody>
                  {droneData.errors.length > 0 ? (
                    droneData.errors.map((error, index) => (
                      <tr key={index}>
                        <td>{error.time}</td>
                        <td>{error.message}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="no-data">오류 로그가 없습니다</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 드론 등록 모달 */}
      {showRegisterModal && (
        <div className="drone-modal-overlay">
          <div className="drone-modal-content">
            <h3>새 드론 등록</h3>
            <div className="form-group">
              <label>드론 이름 *</label>
              <input
                type="text"
                value={registerForm.name}
                onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                placeholder="예: Mavic Pro"
                disabled={registerLoading}
              />
            </div>
            <div className="form-group">
              <label>시리얼 번호 *</label>
              <input
                type="text"
                value={registerForm.serial_number}
                onChange={(e) => setRegisterForm({...registerForm, serial_number: e.target.value})}
                placeholder="예: D45F1A2B3C4D"
                disabled={registerLoading}
              />
            </div>
            <div className="drone-modal-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setShowRegisterModal(false)}
                disabled={registerLoading}
              >
                취소
              </button>
              <button 
                className="btn-register" 
                onClick={handleRegisterDrone}
                disabled={registerLoading}
              >
                {registerLoading ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 드론 편집 모달 */}
      {showEditModal && (
        <div className="drone-modal-overlay">
          <div className="drone-modal-content">
            <h3>드론 편집</h3>
            <div className="form-group">
              <label>드론 이름 *</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                placeholder="드론 이름을 입력하세요"
                disabled={editLoading}
              />
            </div>
            <div className="drone-modal-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setShowEditModal(false)}
                disabled={editLoading}
              >
                취소
              </button>
              <button 
                className="btn-delete" 
                onClick={handleDeleteDrone}
                disabled={editLoading}
              >
                {editLoading ? '처리 중...' : '삭제'}
              </button>
              <button 
                className="btn-update" 
                onClick={handleUpdateDroneName}
                disabled={editLoading}
              >
                {editLoading ? '처리 중...' : '수정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DroneView;