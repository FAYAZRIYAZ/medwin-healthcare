import { lazy, Suspense, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PatientPortal = lazy(() => import('./pages/PatientPortal'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));

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
      <Suspense fallback={<div className="route-loading" role="status">Loading MEDWIN…</div>}>
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
      </Suspense>
    </Router>
  );
}
