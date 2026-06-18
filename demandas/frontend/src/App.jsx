import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import BoardPage from './pages/BoardPage';
import UsersPage from './pages/UsersPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Carregando...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Carregando...</div>;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><BoardPage /></PrivateRoute>} />
          <Route path="/usuarios" element={<AdminRoute><UsersPage /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
