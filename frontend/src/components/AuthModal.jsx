import React, { useState } from 'react';
import API from '../api/client';

export default function AuthModal({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [identifier, setIdentifier] = useState(''); // email or phone
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Pre-configured Admin 1 and Admin 2 credentials check
    if (!isSignUp) {
      // Admin 1: Operations Admin
      if (
        (identifier === 'admin@medwin.com' || identifier === '9502832031') &&
        (password === 'Medwin@2026' || password === 'admin123')
      ) {
        onLoginSuccess({
          email: 'admin@medwin.com',
          name: 'Medwin Operations Admin',
          role: 'admin',
          phone: '9502832031'
        });
        return;
      }

      // Admin 2: Dispatch Lead Admin
      if (
        (identifier === 'dispatch@medwin.com' || identifier === '9347832031') &&
        (password === 'Dispatch@2026' || password === 'admin123')
      ) {
        onLoginSuccess({
          email: 'dispatch@medwin.com',
          name: 'Medwin Dispatch Lead',
          role: 'admin',
          phone: '9347832031'
        });
        return;
      }
    }

    try {
      if (isSignUp) {
        // Patient Registration
        const payload = {
          customer_name: name,
          phone: phone,
          email: identifier,
          role: 'patient',
          password: password
        };

        try {
          await API.post('/complete_signup', payload);
        } catch (apiErr) {
          console.warn('Backend fallback:', apiErr.message);
        }

        onLoginSuccess({
          email: identifier || `${phone}@medwin.com`,
          name: name,
          phone: phone,
          role: 'patient'
        });
      } else {
        // Patient Login
        try {
          const res = await API.post('/login', { identifier, password });
          if (res.data?.user) {
            onLoginSuccess(res.data.user);
            return;
          }
        } catch (apiErr) {
          console.warn('Backend login fallback:', apiErr.message);
        }

        // Offline / Dev fallback login
        onLoginSuccess({
          email: identifier.includes('@') ? identifier : `${identifier}@medwin.com`,
          name: identifier.split('@')[0],
          phone: identifier.replace(/\D/g, '') || '9347832031',
          role: 'patient'
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication error. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        padding: '16px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          maxWidth: '420px',
          width: '100%',
          padding: '32px 24px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
          boxSizing: 'border-box'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              background: '#0284c7',
              color: '#fff',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 900,
              margin: '0 auto 12px auto'
            }}
          >
            M+
          </div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: 800 }}>
            MEDWIN HEALTHCARE
          </h2>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Hyderabad Home Nursing & Oxygen Portal
          </span>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError('');
            }}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              background: !isSignUp ? '#0284c7' : 'transparent',
              color: !isSignUp ? '#fff' : '#64748b'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setError('');
            }}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              background: isSignUp ? '#0284c7' : 'transparent',
              color: isSignUp ? '#fff' : '#64748b'
            }}
          >
            New Sign Up
          </button>
        </div>

        {error && (
          <div
            style={{
              background: '#fee2e2',
              color: '#b91c1c',
              padding: '10px',
              borderRadius: '6px',
              fontSize: '12px',
              marginBottom: '14px'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Patient or Caregiver Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Mobile Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </>
          )}

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              {isSignUp ? 'Email Address (Optional)' : 'Email or Mobile Number *'}
            </label>
            <input
              type="text"
              required={!isSignUp}
              placeholder={isSignUp ? 'name@gmail.com' : 'admin@medwin.com or 9502832031'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Password *
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Authenticating...' : isSignUp ? 'Create Patient Account ➔' : 'Sign In ➔'}
          </button>
        </form>

        {/* 1-Tap Quick Credentials for Testing */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Quick Logins for Testing:</span>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() =>
                onLoginSuccess({
                  email: 'admin@medwin.com',
                  name: 'Medwin Operations Admin',
                  role: 'admin',
                  phone: '9502832031'
                })
              }
              style={{
                fontSize: '11px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                padding: '5px 10px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              Admin 1
            </button>

            <button
              type="button"
              onClick={() =>
                onLoginSuccess({
                  email: 'dispatch@medwin.com',
                  name: 'Medwin Dispatch Lead',
                  role: 'admin',
                  phone: '9347832031'
                })
              }
              style={{
                fontSize: '11px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                padding: '5px 10px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              Admin 2
            </button>

            <button
              type="button"
              onClick={() =>
                onLoginSuccess({
                  email: 'fayaz@medwin.com',
                  name: 'Fayaz (Patient)',
                  role: 'patient',
                  phone: '9347832031'
                })
              }
              style={{
                fontSize: '11px',
                background: '#f0fdf4',
                border: '1px solid #86efac',
                padding: '5px 10px',
                borderRadius: '5px',
                cursor: 'pointer',
                color: '#166534',
                fontWeight: 700
              }}
            >
              Patient
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}