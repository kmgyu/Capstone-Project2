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

// 드론 뷰 컴포넌트
const DroneView = () => {
  // 예시 데이터 - 실제로는 API에서 가져올 것
  const [droneData, setDroneData] = useState({
    gps: {
      latitude: 37.5665,
      longitude: 126.9780,
      altitude: 2,
      signal_strength: 85
    },
    battery: {
      percentage: 78,
      voltage: 11.4,
      estimated_time: 13 // 남은 비행 시간(분)
    },
    status: {
      state: 'flying', // 'flying', 'standby', 'charging', 'error'
      flying_time: 5, // 현재 비행 시간(분)
      motor_rpm: 12000,
      temperature: 38
    },
    errors: [
      { time: '13:45:22', code: 'E201', message: '약한 GPS 신호' },
      { time: '13:40:15', code: 'W104', message: '배터리 25% 미만' }
    ]
  });

  // 일별 체공 시간 데이터
  const [flightTimeData, setFlightTimeData] = useState({
    labels: ['5/3', '5/4', '5/5', '5/6', '5/7', '5/8', '5/9'],
    datasets: [
      {
        label: '체공 시간 (분)',
        data: [20, 18, 25, 10, 15, 20, 22],
        borderColor: 'var(--primary-color)',
        backgroundColor: 'rgba(77, 139, 49, 0.2)',
        tension: 0.4
      }
    ]
  });

  // 배터리 상태에 따른 클래스 결정
  const getBatteryStatusClass = (percentage) => {
    if (percentage >= 70) return 'status-good';
    if (percentage >= 30) return 'status-warning';
    return 'status-critical';
  };

  // 드론 상태에 따른 표시 내용
  const getDroneStatusDisplay = (status) => {
    switch (status) {
      case 'flying':
        return { text: '비행 중', class: 'status-active' };
      case 'standby':
        return { text: '대기 중', class: 'status-standby' };
      case 'charging':
        return { text: '충전 중', class: 'status-charging' };
      case 'error':
        return { text: '오류', class: 'status-critical' };
      default:
        return { text: '상태 미확인', class: 'status-unknown' };
    }
  };

  // 데이터 갱신 시뮬레이션 (실제로는 API 또는 웹소켓 사용)
  useEffect(() => {
    const interval = setInterval(() => {
      // 배터리 감소 시뮬레이션
      setDroneData(prevData => ({
        ...prevData,
        battery: {
          ...prevData.battery,
          percentage: Math.max(prevData.battery.percentage - 1, 0),
          estimated_time: Math.max(prevData.battery.estimated_time - 0.5, 0)
        },
        status: {
          ...prevData.status,
          flying_time: prevData.status.flying_time + 0.5
        },
        gps: {
          ...prevData.gps,
          signal_strength: Math.min(Math.max(prevData.gps.signal_strength + (Math.random() * 2 - 1), 0), 100)
        }
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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
        color: 'var(--text-color)',
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

  return (
    <div className="drone-view">
      {/* 드론 상태 요약 정보 */}
      <div className="drone-status-overview">
        <div className={`status-card ${getDroneStatusDisplay(droneData.status.state).class}`}>
          <h3>비행 상태</h3>
          <div className="status-value">{getDroneStatusDisplay(droneData.status.state).text}</div>
          <div className="status-detail">
            현재 비행 시간: {droneData.status.flying_time.toFixed(1)}분
          </div>
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
          <div className="status-detail">
            잔여 시간: {droneData.battery.estimated_time.toFixed(1)}분
          </div>
        </div>

        <div className="status-card">
          <h3>GPS 상태</h3>
          <div className="status-value">
            신호 강도: {droneData.gps.signal_strength.toFixed(1)}%
          </div>
          <div className="status-detail">
            고도: {droneData.gps.altitude.toFixed(1)}m
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
            <div className="info-value">{droneData.gps.signal_strength.toFixed(1)}%</div>
          </div>
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
                <th>코드</th>
                <th>메시지</th>
              </tr>
            </thead>
            <tbody>
              {droneData.errors.length > 0 ? (
                droneData.errors.map((error, index) => (
                  <tr key={index}>
                    <td>{error.time}</td>
                    <td>{error.code}</td>
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
    </div>
  );
};

export default DroneView;