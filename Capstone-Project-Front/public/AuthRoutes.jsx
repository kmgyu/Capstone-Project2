import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../src/components/auth/Login';
import Register from '../src/components/auth/Register';
import ForgotPassword from '../src/components/auth/ForgotPassword';
import ResetPassword from '../src/components/auth/ResetPassword';
import '../../css/AuthStyles.css';

// 인증 확인을 위한 보호된 라우트 컴포넌트
const ProtectedRoute = ({ children }) => {
  // 여기서는 간단히 localStorage에서 토큰 확인
  // 실제 구현에서는 컨텍스트 API나 리덕스 등을 사용하여 인증 상태 관리
  const isAuthenticated = localStorage.getItem('token') !== null;
  
  if (!isAuthenticated) {
    // 인증되지 않은 경우 로그인 페이지로 리다이렉트
    return <Navigate to="/login/" replace />;
  }
  
  return children;
};

// 이미 로그인한 사용자가 인증 페이지에 접근하는 것을 방지
const AuthRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('token') !== null;
  
  if (isAuthenticated) {
    // 이미 인증된 경우 메인 페이지로 리다이렉트
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const AuthRoutes = () => {
  return (
    <>
      {/* 인증 관련 스타일시트 로드 */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      
      <Routes>
        {/* 인증 페이지 라우트 */}
        <Route 
          path="/login/" 
          element={
            <AuthRoute>
              <Login />
            </AuthRoute>
          } 
        />
        
        <Route 
          path="/register/" 
          element={
            <AuthRoute>
              <Register />
            </AuthRoute>
          } 
        />
        
        <Route 
          path="/forgot-password/" 
          element={
            <AuthRoute>
              <ForgotPassword />
            </AuthRoute>
          } 
        />
        
        <Route 
          path="/reset-password/:token/" 
          element={
            <AuthRoute>
              <ResetPassword />
            </AuthRoute>
          } 
        />
        
        {/* 보호된 라우트 예시 */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              {/* 대시보드 컴포넌트 */}
              <div>대시보드 컴포넌트 (보호됨)</div>
            </ProtectedRoute>
          } 
        />
        
        {/* 기본 리다이렉트 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
};

export default AuthRoutes;