import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/client';

export default function Login({ setAuth }) {
  const [activeTab, setActiveTab] = useState('patient-signin');
  const [signupStep, setSignupStep] = useState(1);
  const [forgotStep, setForgotStep] = useState(1);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [otp, setOtp] = useState('');

  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isPasswordValid = (pwd) => {
    return pwd.length >= 8 && /[a-zA-Z]/.test(pwd) && /\d/.test(pwd) && /[^a-zA-Z0-9]/.test(pwd);
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSignupStep(1);
    setForgotStep(1);
    setError('');
    setStatusMessage('');
    setPassword('');
    setPasswordConfirm('');
    setOtp('');
  };

  const handleRequestPasswordResetOtp = async (e) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');
    setLoading(true);
    try {
      const response = await API.post('/send_password_reset_otp', { identifier: phone.trim() });
      setStatusMessage(response.data.message);
      setForgotStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send password reset OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!isPasswordValid(password)) {
      setError('Password must have >= 8 chars with letters, numbers, and symbols.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await API.post('/reset_password', {
        identifier: phone.trim(),
        otp: otp.trim(),
        password,
        password_confirmation: passwordConfirm
      });
      setStatusMessage('Password reset successfully. Please sign in.');
      setPassword('');
      setPasswordConfirm('');
      setOtp('');
      setForgotStep(1);
      setActiveTab('patient-signin');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await API.post('/login', {
        identifier: phone.trim(),
        password: password,
        is_admin: false
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setAuth(true);
      navigate('/portal');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check phone and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await API.post('/login', {
        identifier: email.trim(),
        password: password,
        is_admin: true
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setAuth(true);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Admin login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');
    setLoading(true);

    try {
      const response = await API.post('/send_signup_otp', {
        name: name.trim(),
        identifier: (activeTab === 'patient-signup' ? email : phone).trim()
      });

      setStatusMessage(response.data.message);
      setSignupStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send verification OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid(password)) {
      setError('Password must have >= 8 chars with letters, numbers, and symbols.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await API.post('/complete_signup', {
        identifier: email.trim() || phone.trim(),
        otp: otp.trim(),
        password: password,
        password_confirmation: passwordConfirm
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setAuth(true);
      navigate('/portal');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: '#ffffff', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', width: '100%', maxWidth: '420px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: activeTab === 'admin-signin' ? '#0f172a' : '#0284c7', color: '#fff', fontSize: '20px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
            M+
          </div>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '20px', fontWeight: 700 }}>MED-WIN Portal</h2>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            {activeTab === 'admin-signin' ? 'Admin Official Access' : 'Patient Services & Care'}
          </span>
        </div>

        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', marginBottom: '20px', gap: '2px' }}>
            <button
            type="button"
            onClick={() => switchTab('patient-signin')}
            style={{
              flex: 1,
              padding: '8px 2px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'patient-signin' ? '#ffffff' : 'transparent',
              color: activeTab === 'patient-signin' ? '#0284c7' : '#64748b',
              boxShadow: activeTab === 'patient-signin' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Patient Sign In
          </button>
          <button
            type="button"
            onClick={() => switchTab('patient-signup')}
            style={{
              flex: 1,
              padding: '8px 2px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'patient-signup' ? '#ffffff' : 'transparent',
              color: activeTab === 'patient-signup' ? '#0284c7' : '#64748b',
              boxShadow: activeTab === 'patient-signup' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => switchTab('admin-signin')}
            style={{
              flex: 1,
              padding: '8px 2px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'admin-signin' ? '#0f172a' : 'transparent',
              color: activeTab === 'admin-signin' ? '#ffffff' : '#64748b',
              boxShadow: activeTab === 'admin-signin' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Admin (Mail)
          </button>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {statusMessage && (
          <div style={{ background: '#f0fdf4', color: '#166534', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', border: '1px solid #bbf7d0' }}>
            {statusMessage}
          </div>
        )}

        {activeTab === 'patient-signin' && (
          <form onSubmit={handlePatientSignIn}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>Mobile Number</label>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9848011223" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Signing In...' : 'Sign In with Phone ➔'}
            </button>
            <button type="button" onClick={() => { setActiveTab('forgot-password'); setError(''); setStatusMessage(''); }} style={{ width: '100%', marginTop: '10px', padding: '8px', background: 'transparent', color: '#0284c7', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
              Forgot password?
            </button>
          </form>
        )}

        {activeTab === 'forgot-password' && forgotStep === 1 && (
          <form onSubmit={handleRequestPasswordResetOtp}>
            <div style={{ marginBottom: '16px', color: '#475569', fontSize: '13px' }}>We will send a password reset OTP to your registered mobile number.</div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>Registered Mobile Number</label>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9848011223" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Sending OTP...' : 'Send Reset OTP ➔'}
            </button>
            <button type="button" onClick={() => switchTab('patient-signin')} style={{ width: '100%', marginTop: '10px', padding: '8px', background: 'transparent', color: '#64748b', border: 'none', fontSize: '13px', cursor: 'pointer' }}>← Back to sign in</button>
          </form>
        )}

        {activeTab === 'forgot-password' && forgotStep === 2 && (
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155', textAlign: 'center' }}>Enter the OTP sent to {phone}</label>
              <input type="text" required maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" autoFocus style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '2px solid #0284c7', fontSize: '18px', textAlign: 'center', letterSpacing: '6px', boxSizing: 'border-box', fontWeight: 'bold' }} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>New Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 chars (Letter + Number + Symbol)" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>Confirm New Password</label>
              <input type="password" required value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="Re-enter password" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" disabled={loading || otp.length < 6 || !isPasswordValid(password)} style={{ width: '100%', padding: '12px', background: (otp.length === 6 && isPasswordValid(password)) ? '#0284c7' : '#94a3b8', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: (otp.length === 6 && isPasswordValid(password)) ? 'pointer' : 'not-allowed' }}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {activeTab === 'patient-signup' && signupStep === 1 && (
          <form onSubmit={handleRequestOtp}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>Full Name *</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ramesh Kumar" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>Email or Mobile Number *</label>
              <input type="text" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com or 9848011223" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Sending OTP...' : 'Send Verification OTP ➔'}
            </button>
          </form>
        )}

        {activeTab === 'patient-signup' && signupStep === 2 && (
          <form onSubmit={handleCompleteSignup}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155', textAlign: 'center' }}>
                Enter OTP sent to <strong>{email || phone}</strong>
              </label>
              <input type="text" required maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" autoFocus style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '2px solid #0284c7', fontSize: '18px', textAlign: 'center', letterSpacing: '6px', boxSizing: 'border-box', fontWeight: 'bold' }} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>Create Password *</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 chars (Letter + Number + Symbol)" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
              <div style={{ fontSize: '11px', color: isPasswordValid(password) ? '#16a34a' : '#64748b', marginTop: '4px' }}>
                {isPasswordValid(password) ? '✓ Password criteria met' : '• Requires ≥ 8 chars, 1 letter, 1 number & 1 symbol'}
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>Confirm Password *</label>
              <input type="password" required value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="Re-enter password" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" disabled={loading || otp.length < 6 || !isPasswordValid(password)} style={{ width: '100%', padding: '12px', background: (otp.length === 6 && isPasswordValid(password)) ? '#0284c7' : '#94a3b8', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: (otp.length === 6 && isPasswordValid(password)) ? 'pointer' : 'not-allowed', marginBottom: '10px' }}>
              {loading ? 'Creating...' : 'Register & Enter Portal'}
            </button>
            <button type="button" onClick={() => { setSignupStep(1); setOtp(''); }} style={{ width: '100%', padding: '8px', background: 'transparent', color: '#64748b', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
              ← Back to Details
            </button>
          </form>
        )}

        {activeTab === 'admin-signin' && (
          <form onSubmit={handleAdminSignIn}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>Admin Email Address</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@medwin.com" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>Admin Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Authenticating Admin...' : 'Authenticate as Admin ➔'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
