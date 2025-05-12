import axios from 'axios';

// API 기본 URL 설정
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://orion.mokpo.ac.kr:8483';

/**
 * bbox 좌표를 보내어 필지 Geometry를 조회합니다.
 * @param {string} bbox - ymin,xmin,ymax,xmax,EPSG:4326 형식의 좌표 문자열
 * @returns {Promise<object>} geometry 데이터 또는 오류 정보
 */
const getGeometryByBBox = async (bbox) => {
  try {
    const token = sessionStorage.getItem('token');

    const response = await axios.post(
      `${API_BASE_URL}/field/get-geometry/`,
      { bbox },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return { success: true, data: response.data.geometry };
  } catch (error) {
    console.error('Geometry 조회 실패:', error.response || error);
    return { success: false, error: error.response?.data?.detail || '요청 실패' };
  }
};

export default {
  getGeometryByBBox,
};
