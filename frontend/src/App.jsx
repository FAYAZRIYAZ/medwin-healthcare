import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PatientPortal from './pages/PatientPortal';
import PaymentPage from './pages/PaymentPage';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setCurrentUser(null);
  };

  return (
    <Router>
      <Routes>
        {/* Auth Route */}
        <Route
          path="/login"
          element={
            currentUser ? (
              currentUser.role === 'admin' ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/portal" replace />
              )
            ) : (
              <Login
                setAuth={(authenticated) => {
                  if (authenticated) {
                    try {
                      setCurrentUser(JSON.parse(localStorage.getItem('user')) || null);
                    } catch {
                      setCurrentUser(null);
                    }
                  }
                }}
              />
            )
          }
        />

        {/* Admin Dashboard - Protected */}
        <Route
          path="/dashboard"
          element={
            currentUser && currentUser.role === 'admin' ? (
              <Dashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Patient Portal - Protected */}
        <Route
          path="/portal"
          element={
            currentUser ? (
              <PatientPortal onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Payment Gateway */}
        <Route
          path="/payment"
          element={
            currentUser ? (
              <PaymentPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Default Route */}
        <Route
          path="*"
          element={<Navigate to={currentUser ? (currentUser.role === 'admin' ? '/dashboard' : '/portal') : '/login'} replace />}
        />
      </Routes>
    </Router>
  );
}
