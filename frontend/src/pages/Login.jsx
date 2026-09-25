import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/client';

const FREE_SAMPLE_OTP = '123456';

export default function Login({ setAuth }) {
  const [mode, setMode] = useState('patient');
  const [step, setStep] = useState('details');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [testOtp, setTestOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const saveSession = (response, destination) => {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    setAuth(true);
    navigate(destination);
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();
    setError('');
    setStatusMessage('');
    if (!name.trim() || !/^\+?[0-9]{10,15}$/.test(phone.replace(/\s+/g, ''))) {
      setError('Enter your full name and a valid 10–15 digit mobile number.');
      return;
    }

    setLoading(true);
    setTestOtp(FREE_SAMPLE_OTP);
    setDemoOtp(true);
    try {
      const response = await API.post('/send_signup_otp', {
        name: name.trim(),
        identifier: phone.trim()
      });
      let message = response.data.message || 'OTP sent to your mobile number.';
      if (response.data.debug_otp) {
        setOtp(response.data.debug_otp);
        setTestOtp(response.data.debug_otp);
        setDemoOtp(false);
        message += ' Use the temporary OTP shown below.';
      }
      setStatusMessage(message);
      setStep('otp');
    } catch (err) {
      if (err.response?.status === 409) {
        setTestOtp(FREE_SAMPLE_OTP);
        setOtp(FREE_SAMPLE_OTP);
        setDemoOtp(true);
        setStatusMessage('Temporary demo OTP generated because SMS is not connected yet.');
        setStep('otp');
      } else {
        setError(err.response?.data?.error || 'Could not send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError('');
    if (!/^\d{4,8}$/.test(otp.trim())) {
      setError('Enter the OTP sent to your mobile number.');
      return;
    }

    setLoading(true);
    try {
      if (demoOtp && otp.trim() === testOtp) {
        const user = { name: name.trim(), phone: phone.trim().replace(/\s+/g, ''), role: 'patient' };
        localStorage.setItem('token', 'temporary-patient-session');
        localStorage.setItem('user', JSON.stringify(user));
        setAuth(true);
        navigate('/portal');
        return;
      }

      const response = await API.post('/complete_signup', {
        identifier: phone.trim(),
        otp: otp.trim(),
        password: 'TempPass123!',
        password_confirmation: 'TempPass123!'
      });
      saveSession(response, '/portal');
    } catch (err) {
      setError(err.response?.data?.error || 'OTP verification failed. Please request a new OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await API.post('/login', {
        identifier: adminEmail.trim(),
        password: adminPassword,
        is_admin: true
      });
      saveSession(response, '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Admin login failed.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setStep('details');
    setError('');
    setStatusMessage('');
    setOtp('');
    setTestOtp('');
    setDemoOtp(false);
  };

  return (
    <div className="auth-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f8fafc', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: '#ffffff', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(15,23,42,0.08)', width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: mode === 'admin' ? '#0f172a' : '#0284c7', color: '#fff', fontSize: '21px', fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>M+</div>
          <h2 style={{ margin: '10px 0 3px', color: '#0f172a', fontSize: '21px' }}>MEDWIN HEALTHCARE</h2>
          <span style={{ fontSize: '12px', color: '#64748b' }}>{mode === 'admin' ? 'Admin Operations Access' : 'Patient Services & Care'}</span>
        </div>

        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '9px', marginBottom: '20px', gap: '4px' }}>
          <button type="button" onClick={() => switchMode('patient')} style={{ flex: 1, border: 0, borderRadius: '7px', padding: '9px', fontWeight: 800, cursor: 'pointer', background: mode === 'patient' ? '#0284c7' : 'transparent', color: mode === 'patient' ? '#fff' : '#64748b' }}>Patient</button>
          <button type="button" onClick={() => switchMode('admin')} style={{ flex: 1, border: 0, borderRadius: '7px', padding: '9px', fontWeight: 800, cursor: 'pointer', background: mode === 'admin' ? '#0f172a' : 'transparent', color: mode === 'admin' ? '#fff' : '#64748b' }}>Admin</button>
        </div>

        {error && <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', padding: '11px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, marginBottom: '14px' }}>{error}</div>}
        {statusMessage && <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '11px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, marginBottom: '14px' }}>{statusMessage}</div>}
        {mode === 'patient' && step === 'otp' && testOtp && (
          <div style={{ background: '#fff7ed', border: '2px solid #fb923c', color: '#9a3412', padding: '14px', borderRadius: '10px', textAlign: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.5px' }}>FREE SAMPLE OTP</div>
            <div style={{ fontSize: '30px', fontWeight: 900, letterSpacing: '8px', marginTop: '4px' }}>{testOtp}</div>
            <div style={{ fontSize: '11px', marginTop: '4px' }}>Enter this code to continue. SMS will be connected later.</div>
          </div>
        )}

        {mode === 'patient' ? (
          step === 'details' ? (
            <form onSubmit={handleSendOtp}>
              <p style={{ color: '#475569', fontSize: '13px', lineHeight: 1.5, margin: '0 0 18px' }}>Enter your details once. We’ll verify your mobile with an OTP and take you directly into the patient portal.</p>
              <label style={{ display: 'block', color: '#334155', fontSize: '11px', fontWeight: 800, marginBottom: '5px' }}>FULL NAME</label>
              <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Patient or caregiver name" style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '14px', fontSize: '14px' }} />
              <label style={{ display: 'block', color: '#334155', fontSize: '11px', fontWeight: 800, marginBottom: '5px' }}>MOBILE NUMBER</label>
              <input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="10-digit mobile number" style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '18px', fontSize: '14px' }} />
              <button disabled={loading} type="submit" style={{ width: '100%', padding: '12px', border: 0, borderRadius: '8px', background: '#0284c7', color: '#fff', fontWeight: 800, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Sending OTP…' : 'Continue with OTP →'}</button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <p style={{ color: '#475569', fontSize: '13px', lineHeight: 1.5, margin: '0 0 18px' }}>Enter the OTP sent to <strong>{phone}</strong> to continue.</p>
              <label style={{ display: 'block', color: '#334155', fontSize: '11px', fontWeight: 800, marginBottom: '5px' }}>ONE-TIME PASSWORD</label>
              <input required autoFocus inputMode="numeric" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="Enter OTP" style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '18px', fontSize: '20px', letterSpacing: '5px', textAlign: 'center' }} />
              <button disabled={loading} type="submit" style={{ width: '100%', padding: '12px', border: 0, borderRadius: '8px', background: '#0284c7', color: '#fff', fontWeight: 800, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Verifying…' : 'Verify & Enter Patient Portal'}</button>
              <button type="button" onClick={() => { setStep('details'); setError(''); setStatusMessage(''); setTestOtp(''); setOtp(''); setDemoOtp(false); }} style={{ width: '100%', marginTop: '10px', padding: '9px', border: 0, background: 'transparent', color: '#0284c7', fontWeight: 700, cursor: 'pointer' }}>Use a different number</button>
            </form>
          )
        ) : (
          <form onSubmit={handleAdminLogin}>
            <label style={{ display: 'block', color: '#334155', fontSize: '11px', fontWeight: 800, marginBottom: '5px' }}>ADMIN EMAIL OR PHONE</label>
            <input required value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} placeholder="admin@medwin.com" style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '14px', fontSize: '14px' }} />
            <label style={{ display: 'block', color: '#334155', fontSize: '11px', fontWeight: 800, marginBottom: '5px' }}>PASSWORD</label>
            <input required type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="Enter admin password" style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '18px', fontSize: '14px' }} />
            <button disabled={loading} type="submit" style={{ width: '100%', padding: '12px', border: 0, borderRadius: '8px', background: '#0f172a', color: '#fff', fontWeight: 800, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Signing in…' : 'Admin Sign In →'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
