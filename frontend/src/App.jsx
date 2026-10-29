import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import BotanicalBackground from './components/BotanicalBackground';
import ProtectedRoute from './routes/ProtectedRoute';

import Login from './pages/Login';
import BookVisit from './pages/BookVisit';
import Appointments from './pages/Appointments';
import Reports from './pages/Reports';

function RootRedirect() {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (role === 'ADMIN') {
    return <Navigate to="/reports" replace />;
  }
  if (role === 'DOCTOR') {
    return <Navigate to="/appointments" replace />;
  }
  return <Navigate to="/book" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          {/* Botanical background stays fixed across all pages */}
          <BotanicalBackground />

          <Routes>
            {/* Public Auth Screen */}
            <Route path="/login" element={<Login />} />

            {/* Authenticated Screens */}
            <Route element={<ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']} />}>
              <Route path="/book" element={<BookVisit />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['PATIENT', 'DOCTOR', 'ADMIN']} />}>
              <Route path="/appointments" element={<Appointments />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/reports" element={<Reports />} />
            </Route>

            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
