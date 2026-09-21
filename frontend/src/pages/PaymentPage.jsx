import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../api/client';

const OFFICIAL_UPI_ID = 'Q084564939@ybl';
const PAYEE_NAME = 'MEDWIN HEALTHCARE';

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const { item, customerName, amount, bookingPayload } = location.state || {
    item: 'Oxygen / Lab Diagnostic Service',
    customerName: 'Valued Patient',
    amount: '₹449',
    bookingPayload: {}
  };

  const numericAmount = amount ? amount.toString().replace(/\D/g, '') : '449';
  const upiUrl = `upi://pay?pa=${encodeURIComponent(OFFICIAL_UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${encodeURIComponent(numericAmount)}&cu=INR&tn=${encodeURIComponent(`Medwin ${item}`)}`;

  const [utrNumber, setUtrNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    const cleanUtr = utrNumber.trim().replace(/[^0-9a-zA-Z]/g, '');
    
    if (cleanUtr.length < 6) {
      setError('Please enter a valid 12-digit UPI / UTR Reference number from your payment app.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const finalPayload = {
        ...(bookingPayload || {}),
        item: item,
        customer_name: customerName,
        amount: amount,
        payment_mode: `Online UPI (UTR: ${cleanUtr})`,
        status: 'Pending'
      };

      await API.post('/bookings', JSON.stringify(finalPayload));
      navigate('/dashboard'); // Direct navigation so admin/user sees it instantly
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit payment. Please verify your connection.');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '28px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '18px' }}>
          <div>
            <span style={{ fontSize: '11px', background: '#f5f3ff', color: '#6b21a8', padding: '3px 8px', borderRadius: '4px', fontWeight: 800 }}>
              VERIFIED PHONEPE GATEWAY
            </span>
            <h2 style={{ margin: '6px 0 0 0', fontSize: '18px', color: '#0f172a' }}>Complete Online Payment</h2>
          </div>
          <button
            onClick={() => navigate('/portal')}
            style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 700, color: '#475569' }}
          >
            ✕ Cancel
          </button>
        </div>

        {/* Order Details */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Item / Service:</div>
          <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{item}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Total Payable:</span>
            <span style={{ fontSize: '22px', fontWeight: 900, color: '#0284c7' }}>{amount}</span>
          </div>
        </div>

        {/* Scanner Card */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'inline-block', padding: '10px', background: '#ffffff', border: '2px solid #5f259f', borderRadius: '14px', boxShadow: '0 4px 12px rgba(95, 37, 159, 0.1)' }}>
            <img
              src="/scanner.jpeg"
              alt="PhonePe Scanner"
              onError={(e) => {
                e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`;
              }}
              style={{ width: '210px', height: 'auto', maxHeight: '270px', objectFit: 'contain', display: 'block', margin: '0 auto', borderRadius: '8px' }}
            />
          </div>

          <div style={{ marginTop: '12px', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '10px 14px', borderRadius: '8px' }}>
            <span style={{ fontSize: '11px', color: '#6b21a8', fontWeight: 800 }}>OFFICIAL PHONEPE UPI ID:</span>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#5f259f', fontFamily: 'monospace', marginTop: '3px' }}>
              {OFFICIAL_UPI_ID}
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <a
              href={upiUrl}
              style={{ display: 'block', background: '#5f259f', color: '#ffffff', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 800, textDecoration: 'none' }}
            >
              📱 Tap to Open GPay / PhonePe App
            </a>
          </div>
        </div>

        {/* UTR Reference Form */}
        <form onSubmit={handleConfirmPayment}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', color: '#0f172a', marginBottom: '4px' }}>
              Enter 12-Digit UTR / Transaction Reference ID *
            </label>
            <input
              type="text"
              required
              maxLength={22}
              placeholder="e.g. 123456789987654"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1.5px solid #a855f7', fontSize: '14px', fontFamily: 'monospace', fontWeight: 800, color: '#3b0764', background: '#faf5ff', boxSizing: 'border-box' }}
            />
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>
              Check your PhonePe/GPay receipt details for the 12-digit UTR reference.
            </span>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', marginBottom: '12px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{ width: '100%', padding: '13px', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}
          >
            {submitting ? 'Submitting Reference...' : 'Confirm Payment & Submit Order ➔'}
          </button>
        </form>

      </div>
    </div>
  );
}
