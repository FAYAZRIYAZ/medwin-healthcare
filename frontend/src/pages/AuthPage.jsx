import React, { useState } from 'react';

const ADMIN_ACCOUNTS = {
  'admin@medwin.com': 'Medwin@2026',
  'dispatch@medwin.com': 'Medwin@2026'
};

export default function AuthPage({ onLoginSuccess }) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    const cleanUser = emailOrPhone.trim().toLowerCase();

    // Check Admin Login
    if (ADMIN_ACCOUNTS[cleanUser]) {
      if (password !== ADMIN_ACCOUNTS[cleanUser]) {
        setError('❌ Invalid admin password. You must enter Medwin@2026');
        return;
      }

      const adminUser = {
        name: cleanUser === 'admin@medwin.com' ? 'Dr. Fayaz (Chief Admin)' : 'Hyderabad Dispatch Desk',
        email: cleanUser,
        role: 'admin',
        token: 'admin-auth-token'
      };

      onLoginSuccess(adminUser);
      return;
    }

    // Patient Login
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    const patientUser = {
      name: 'Valued Patient',
      phone: cleanUser.replace(/\D/g, '') || '9347832031',
      role: 'patient',
      token: 'patient-token'
    };

    onLoginSuccess(patientUser);
  };

  // Helper: ONLY fills the email input. Does NOT log in!
  const pickAccount = (email) => {
    setEmailOrPhone(email);
    setPassword('');
    setError('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '400px', width: '100%', padding: '32px 28px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)' }}>
        
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{ width: '48px', height: '48px', background: '#0284c7', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '22px', color: '#fff' }}>
            M+
          </div>
          <h2 style={{ margin: '10px 0 2px 0', fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
            MEDWIN HEALTHCARE
          </h2>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Enter credentials to sign in</span>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
              EMAIL OR PHONE NUMBER *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. admin@medwin.com or 9347832031"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
              PASSWORD *
            </label>
            <input
              type="password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            style={{ width: '100%', padding: '12px', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}
          >
            Sign In ➔
          </button>
        </form>

        {/* Helper buttons that only paste the email */}
        <div style={{ marginTop: '22px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '8px', textAlign: 'center' }}>
            FILL EMAIL ONLY (MUST TYPE PASSWORD):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => pickAccount('admin@medwin.com')}
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}
            >
              Fill Admin 1
            </button>
            <button
              type="button"
              onClick={() => pickAccount('dispatch@medwin.com')}
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}
            >
              Fill Dispatch Desk
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
