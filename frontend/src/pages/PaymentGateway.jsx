import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../api/client';

export default function PaymentGateway() {
  const location = useLocation();
  const navigate = useNavigate();
  const orderDetails = location.state;

  const [utrNumber, setUtrNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'submitted', 'failed'

  if (!orderDetails) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', background: '#ffffff', padding: '32px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>No Pending Order Found</h3>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 16px 0' }}>Please select a medical service first.</p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ padding: '10px 18px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Strict Validation: Validates exact 12 numeric digits and rejects dummy repeats
  const validateUTR = (utr) => {
    const cleaned = utr.trim();

    if (!/^\d{12}$/.test(cleaned)) {
      return 'Invalid UTR! A genuine UPI Reference Number must be exactly 12 numeric digits.';
    }

    if (/^(\d)\1{11}$/.test(cleaned)) {
      return 'Invalid UTR! Repeated digits (e.g. 000000000000) are not allowed.';
    }

    if (cleaned === '123456789012' || cleaned === '012345678901') {
      return 'Invalid UTR! Sequential test numbers are not accepted.';
    }

    return null;
  };

  const handlePaymentSubmit = async () => {
    setErrorMsg('');
    const validationError = validateUTR(utrNumber);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setProcessing(true);
    try {
      // Submits as Pending with 12-digit UTR attached for Admin verification
      await API.post('/bookings', new URLSearchParams({
        ...orderDetails.bookingPayload,
        payment_mode: `Online UPI [UTR: ${utrNumber.trim()}]`,
        status: 'Pending'
      }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

      setPaymentStatus('submitted');
    } catch {
      setErrorMsg('Failed to record transaction. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentCancel = async () => {
    setProcessing(true);
    try {
      await API.post('/bookings', new URLSearchParams({
        ...orderDetails.bookingPayload,
        payment_mode: 'Online UPI (Cancelled/Failed)',
        status: 'Rejected'
      }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      setPaymentStatus('failed');
    } catch {
      setErrorMsg('Error recording cancellation.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '480px', padding: '32px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.06)' }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '48px', height: '48px', background: '#0284c7', borderRadius: '12px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', fontWeight: 800, fontSize: '20px' }}>
            M+
          </div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', color: '#0f172a' }}>MED-WIN Online Payment</h2>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Transfer amount & provide 12-digit UTR</span>
        </div>

        {/* Order Details */}
        <div style={{ background: '#f1f5f9', borderRadius: '10px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#64748b' }}>Service / Item:</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{orderDetails.item}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#64748b' }}>Patient:</span>
            <span style={{ fontWeight: 600 }}>{orderDetails.customerName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '8px' }}>
            <span style={{ fontWeight: 700 }}>Payable Amount:</span>
            <span style={{ fontWeight: 800, color: '#0284c7', fontSize: '16px' }}>{orderDetails.amount}</span>
          </div>
        </div>

        {/* SCREEN: SUBMITTED FOR ADMIN VERIFICATION */}
        {paymentStatus === 'submitted' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>⏳</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#0284c7' }}>UTR Submitted for Verification</h3>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', marginBottom: '20px' }}>
              Your 12-digit UTR (<strong style={{ fontFamily: 'monospace' }}>{utrNumber}</strong>) has been forwarded to the Admin portal. Once confirmed with our SBI records, your order will be approved for dispatch.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ width: '100%', padding: '12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
            >
              Return to Patient Portal ➔
            </button>
          </div>
        )}

        {/* SCREEN: FAILED / CANCELLED */}
        {paymentStatus === 'failed' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>❌</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#dc2626' }}>Payment Cancelled / Declined</h3>
            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}>
              The transaction was cancelled. The request has been flagged as <strong>Rejected</strong>.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setPaymentStatus(null)}
                style={{ flex: 1, padding: '10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Retry Payment
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Back to Portal
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE FORM: INPUT 12-DIGIT UTR */}
        {!paymentStatus && (
          <div>
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, color: '#166534', fontSize: '13px', marginBottom: '8px' }}>
                Official Bank & UPI Transfer Destination
              </div>
              <div style={{ fontSize: '13px', color: '#14532d', lineHeight: '1.8' }}>
                <div>• <strong>UPI ID:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700, background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>9347832031@sbi</span></div>
                <div>• <strong>Primary Phone / GPay / PhonePe:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>9347832031</span></div>
                <div>• <strong>Bank Account Number:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>37058380854</span> (SBI)</div>
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                Enter Exact 12-Digit UPI Ref / UTR Number *
              </label>
              <input
                type="text"
                maxLength={12}
                placeholder="e.g. 628490192831"
                value={utrNumber}
                onChange={(e) => {
                  setUtrNumber(e.target.value.replace(/\D/g, ''));
                  setErrorMsg('');
                }}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '6px',
                  border: errorMsg ? '2px solid #dc2626' : '1px solid #cbd5e1',
                  fontSize: '15px',
                  letterSpacing: '2px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                {utrNumber.length}/12 Digits entered
              </div>
              {errorMsg && (
                <div style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600, marginTop: '6px' }}>
                  ⚠ {errorMsg}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                disabled={processing}
                onClick={handlePaymentSubmit}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {processing ? 'Submitting...' : 'Submit 12-Digit UTR for Verification ➔'}
              </button>

              <button
                disabled={processing}
                onClick={handlePaymentCancel}
                style={{
                  width: '100%',
                  padding: '11px',
                  background: '#fee2e2',
                  color: '#b91c1c',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ✕ Payment Failed / Cancel Order
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}