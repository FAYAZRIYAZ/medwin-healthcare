import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/client';

const DIAGNOSTIC_TESTS = [
  { id: 'lab-cbp', name: 'Complete Blood Picture (CBP / CBC)', badge: '⚡ 6-Hr WhatsApp', price: 299, desc: 'Hemoglobin, Platelet count, WBC, RBC & infection screening.' },
  { id: 'lab-sugar', name: 'Advanced Diabetes Profile (HbA1c + Sugar)', badge: '🩸 Fasting Required', price: 449, desc: 'Fasting Blood Sugar (FBS) + HbA1c 3-month average glucose.' },
  { id: 'lab-thyroid', name: 'Complete Thyroid Profile (T3, T4, TSH)', badge: '🧪 Hormone Panel', price: 499, desc: 'Total T3, Total T4 & Ultrasensitive TSH immunoassays.' },
  { id: 'lab-master', name: 'Medwin Master Full Body Checkup (68 Tests)', badge: '🏆 Best Value', price: 1299, desc: 'Liver (LFT), Kidney (KFT), Lipids, CBP, Sugar & Urine.' },
  { id: 'lab-elderly', name: 'Bedridden Critical Electrolytes Panel', badge: '🚑 Critical Care', price: 899, desc: 'Serum Sodium, Potassium, Chloride, Urea & Creatinine.' }
];

const RENTAL_CYLINDERS = [
  { id: '10l-rent', name: '10L Portable Oxygen Kit', rate: 350, deposit: 3500, desc: 'Aluminium cylinder with regulator, flowmeter, cannula & trolley.' },
  { id: '47l-rent', name: '47L High-Capacity Jumbo Cylinder', rate: 750, deposit: 7000, desc: 'Bedside cylinder for continuous intensive oxygen supply.' },
  { id: 'conc-rent', name: '5L Continuous Oxygen Concentrator', rate: 1200, deposit: 10000, desc: 'Generates 93% pure oxygen continuously without swapping tanks.' }
];

const REFILL_OPTIONS = [
  { id: '10l-refill', name: '10L B-Type Refill Swap', price: 250, time: '30-45 Mins', desc: 'Exchange empty cylinder for a certified 100% full cylinder.' },
  { id: '47l-refill', name: '47L D-Bulk Jumbo Refill Swap', price: 650, time: '45-60 Mins', desc: 'Heavy cylinder doorstep replacement by delivery crew.' }
];

const HOME_CARE_SERVICES = [
  { id: 'hc-1', title: '12-Hour Qualified Day / Night Nurse', ratePerDay: 1200, desc: 'Vitals tracking, IV infusions, nebulization, medication & wound dressing.' },
  { id: 'hc-2', title: '24-Hour Residential Patient Attendant', ratePerDay: 1800, desc: 'Bed-bath, feeding, turning, pulse oximetry & mobility assistance.' }
];

export default function PatientPortal({ onLogout }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [selectedMenu, setSelectedMenu] = useState('doctors');

  const [myOrders, setMyOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  const [patientName] = useState(user.name || 'Fayaz');
  const [phone, setPhone] = useState(user.phone || '9347832031');
  const [address, setAddress] = useState(localStorage.getItem('saved_patient_address') || 'Hyderabad');

  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(availableDoctors[0] || null);
  const [docTimeSlot, setDocTimeSlot] = useState('Today - Morning Slot (10:00 AM - 12:00 PM)');
  const [docPayMode, setDocPayMode] = useState('Online Pay');
  const formatDoctorFee = (fee) => `₹${fee.toString().replace(/^₹+/, '')}`;

  // Diagnostics State
  const [selectedLabTest, setSelectedLabTest] = useState(DIAGNOSTIC_TESTS[0]);
  const [labSlot] = useState('07:30 AM - Morning Fasting');
  const [labPayMode, setLabPayMode] = useState('Online Pay');

  // Oxygen State
  const [activeCylinderTab, setActiveCylinderTab] = useState('rental');
  const [selectedRental, setSelectedRental] = useState(RENTAL_CYLINDERS[0]);
  const [rentalDays] = useState(7);
  const [rentalPayMode, setRentalPayMode] = useState('Online Pay');
  const [selectedRefill, setSelectedRefill] = useState(REFILL_OPTIONS[0]);
  const [refillPayMode, setRefillPayMode] = useState('Online Pay');

  // Home Care State
  const [selectedHomeCare, setSelectedHomeCare] = useState(HOME_CARE_SERVICES[0]);
  const [hcDays] = useState(7);
  const [hcPurpose] = useState('Post-op recovery & daily vitals tracking');
  const [hcPayMode, setHcPayMode] = useState('Online Pay');

  const [loading, setLoading] = useState(false);

  const syncDoctors = async () => {
    try {
      const res = await API.get('/doctors');
      const fresh = Array.isArray(res.data) ? res.data : [];
      setAvailableDoctors(fresh);
      setSelectedDoctor((prev) => {
        if (!fresh.length) return null;
        if (!prev) return fresh[0];
        return fresh.find((d) => d.id === prev.id) || fresh[0];
      });
    } catch (err) {
      console.error('Failed to load doctors:', err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    syncDoctors();
    const handleStorage = () => syncDoctors();
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(syncDoctors, 400);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const fetchMyOrders = async () => {
    setLoadingOrders(true);
    setOrdersError('');
    try {
      const res = await API.get(`/bookings?phone=${encodeURIComponent(phone)}`);
      if (Array.isArray(res.data)) {
        setMyOrders(res.data);
      }
    } catch (err) {
      console.error(err);
      setOrdersError('Bookings could not be loaded. Check your connection and try again.');
    } finally {
      setLoadingOrders(false);
    }
  };

  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchMyOrders();
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  const handleDoctorSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoctor) return alert('Please select an active doctor.');
    if (!address.trim()) return alert('Please enter visit address.');

    const totalAmount = formatDoctorFee(selectedDoctor.fee);
    const itemTitle = `Doctor Visit: ${selectedDoctor.name} [${selectedDoctor.specialty}] - Slot: ${docTimeSlot}`;

    const payload = {
      booking_type: 'doctor',
      customer_name: patientName,
      phone: phone,
      item: itemTitle,
      delivery_address: address,
      amount: totalAmount,
      deposit: 'N/A',
      doctor_time_slot: docTimeSlot
    };

    if (docPayMode === 'Online Pay') {
      navigate('/payment', { state: { item: itemTitle, customerName: patientName, amount: totalAmount, bookingPayload: payload } });
      return;
    }

    setLoading(true);
    try {
      const bookingForm = new URLSearchParams({
        ...payload,
        payment_mode: 'Cash to Doctor on Visit',
        status: 'Pending'
      });
      await API.post('/bookings', bookingForm, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      alert(`Appointment confirmed with ${selectedDoctor.name}!`);
      fetchMyOrders();
      setSelectedMenu('my_orders');
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCylinderSubmit = async (e) => {
    e.preventDefault();
    if (!address.trim()) return alert('Please enter delivery address.');

    const isRental = activeCylinderTab === 'rental';
    const totalAmount = isRental ? `₹${selectedRental.rate * parseInt(rentalDays || 1)}` : `₹${selectedRefill.price}`;
    const itemTitle = isRental ? `${selectedRental.name} (${rentalDays} Days Rental)` : `Oxygen Refill: ${selectedRefill.name}`;
    const chosenPay = isRental ? rentalPayMode : refillPayMode;

    const payload = {
      booking_type: 'cylinder',
      customer_name: patientName,
      phone: phone,
      item: itemTitle,
      delivery_address: address,
      amount: totalAmount,
      deposit: isRental ? `₹${selectedRental.deposit}` : 'N/A',
      duration_days: isRental ? rentalDays : 1
    };

    if (chosenPay === 'Online Pay') {
      navigate('/payment', { state: { item: itemTitle, customerName: patientName, amount: totalAmount, bookingPayload: payload } });
      return;
    }

    setLoading(true);
    try {
      await API.post('/bookings', { ...payload, payment_mode: 'Cash on Delivery (COD)', status: 'Pending' });
      alert('Oxygen booking confirmed!');
      fetchMyOrders();
      setSelectedMenu('my_orders');
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHomeCareSubmit = async (e) => {
    e.preventDefault();
    if (!address.trim()) return alert('Please enter patient care address.');

    const totalAmount = `₹${selectedHomeCare.ratePerDay * parseInt(hcDays || 1)}`;
    const itemTitle = `${selectedHomeCare.title} [Req: ${hcPurpose} | ${hcDays} Days]`;

    const payload = {
      booking_type: 'homecare',
      customer_name: patientName,
      phone: phone,
      item: itemTitle,
      delivery_address: address,
      amount: totalAmount,
      deposit: 'N/A',
      duration_days: hcDays
    };

    if (hcPayMode === 'Online Pay') {
      navigate('/payment', { state: { item: itemTitle, customerName: patientName, amount: totalAmount, bookingPayload: payload } });
      return;
    }

    setLoading(true);
    try {
      await API.post('/bookings', { ...payload, payment_mode: 'Cash on Duty', status: 'Pending' });
      alert('Home care requested!');
      fetchMyOrders();
      setSelectedMenu('my_orders');
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLabSubmit = async (e) => {
    e.preventDefault();
    if (!address.trim()) return alert('Please enter delivery address.');

    const totalAmount = `₹${selectedLabTest.price}`;
    const payload = {
      booking_type: 'diagnostics',
      customer_name: patientName,
      phone: phone,
      item: `Diagnostics: ${selectedLabTest.name} (${labSlot})`,
      delivery_address: address,
      amount: totalAmount,
      deposit: 'N/A'
    };

    if (labPayMode === 'Online Pay') {
      navigate('/payment', { state: { item: `Diagnostics: ${selectedLabTest.name}`, customerName: patientName, amount: totalAmount, bookingPayload: payload } });
      return;
    }

    setLoading(true);
    try {
      await API.post('/bookings', { ...payload, payment_mode: 'Cash on Collection', status: 'Pending' });
      alert('Lab collection confirmed!');
      fetchMyOrders();
      setSelectedMenu('my_orders');
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="patient-shell" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Sidebar */}
      <aside className="patient-sidebar" style={{ width: '270px', background: '#0f172a', color: '#fff', padding: '24px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px' }}>
            <div style={{ width: '40px', height: '40px', background: '#0284c7', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '18px' }}>M+</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '16px' }}>MEDWIN HEALTH</div>
              <div style={{ fontSize: '11px', color: '#7dd3fc' }}>Hyderabad Home Care</div>
            </div>
          </div>

          <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800 }}>LOGGED IN PATIENT</span>
            <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>{patientName}</div>
            <div style={{ fontSize: '12px', color: '#38bdf8' }}>+91 {phone}</div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { id: 'home', icon: '⌂', label: 'Home' },
              { id: 'doctors', icon: '👨‍⚕️', label: 'Consult Available Doctors' },
              { id: 'oxygen', icon: '🫁', label: 'Oxygen Cylinder Rentals' },
              { id: 'homecare', icon: '🏠', label: 'Home Nursing Care' },
              { id: 'diagnostics', icon: '🔬', label: 'Rapid Lab Diagnostics' },
              { id: 'my_orders', icon: '📦', label: `Track Bookings (${myOrders.length})` }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedMenu(t.id === 'home' ? 'doctors' : t.id);
                  if (t.id === 'my_orders') fetchMyOrders();
                  if (t.id === 'doctors') syncDoctors();
                }}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: selectedMenu === t.id ? '#0284c7' : 'transparent',
                  color: selectedMenu === t.id ? '#ffffff' : '#94a3b8',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px'
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </nav>
        </div>

        <button
          onClick={onLogout}
          aria-label="Sign out"
          style={{ width: '100%', background: 'rgba(248, 113, 113, 0.12)', color: '#fecaca', border: '1px solid rgba(248, 113, 113, 0.24)', padding: '11px 12px', borderRadius: '9px', fontWeight: 800, cursor: 'pointer', textAlign: 'left' }}
        >
          ↪&nbsp; Sign Out
        </button>
      </aside>

      {/* Main Content */}
      <main className="patient-content" style={{ flex: 1, padding: '28px', maxWidth: '1050px', margin: '0 auto', width: '100%' }}>
        
        {/* DOCTORS SELECTION */}
        {selectedMenu === 'doctors' && (
          <div>
            <div style={{ marginBottom: '18px' }}>
              <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1e40af', padding: '3px 8px', borderRadius: '4px', fontWeight: 800 }}>
                👨‍⚕️ HYDERABAD VERIFIED MEDICAL ROSTER
              </span>
              <h2 style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>
                Select Doctor & Appointment Slot
              </h2>
            </div>

            {availableDoctors.length === 0 ? (
              <div style={{ background: '#fff', padding: '40px', borderRadius: '12px', textAlign: 'center', border: '1px solid #cbd5e1', color: '#64748b' }}>
                No doctors currently active on duty. Please check back later or contact support.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px', marginBottom: '22px' }}>
                {availableDoctors.map((doc) => {
                  const isSelected = selectedDoctor && (selectedDoctor.id === doc.id || selectedDoctor.name === doc.name);
                  return (
                    <div
                      key={doc.id || doc.name}
                      onClick={() => setSelectedDoctor(doc)}
                      style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: isSelected ? '2.5px solid #0284c7' : '1px solid #cbd5e1',
                        padding: '16px',
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 4px 12px rgba(2, 132, 199, 0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
                        position: 'relative'
                      }}
                    >
                      {isSelected && (
                        <span style={{ position: 'absolute', top: '10px', right: '10px', background: '#0284c7', color: '#fff', fontSize: '9px', fontWeight: 900, padding: '2px 6px', borderRadius: '10px' }}>
                          ✓ SELECTED
                        </span>
                      )}
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>{doc.name}</h4>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', marginBottom: '8px' }}>{doc.specialty}</div>
                      
                      <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11.5px', color: '#334155' }}>
                        <div>🕒 <strong>Shift:</strong> {doc.timing || '10:00 AM - 02:00 PM'}</div>
                        <div>💰 <strong>Fee:</strong> <span style={{ color: '#16a34a', fontWeight: 800 }}>{formatDoctorFee(doc.fee)} / visit</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedDoctor && availableDoctors.length > 0 && (
              <form onSubmit={handleDoctorSubmit} style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>SELECTED PHYSICIAN:</span>
                    <h3 style={{ margin: '2px 0 0 0', fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                      {selectedDoctor.name} ({selectedDoctor.specialty})
                    </h3>
                  </div>
                  <strong style={{ fontSize: '22px', color: '#0284c7' }}>{formatDoctorFee(selectedDoctor.fee)}</strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Appointment Time Slot *</label>
                    <select
                      value={docTimeSlot}
                      onChange={(e) => setDocTimeSlot(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value="Today - Morning Slot (10:00 AM - 12:00 PM)">Today - Morning Slot (10:00 AM - 12:00 PM)</option>
                      <option value="Today - Afternoon Slot (02:00 PM - 04:00 PM)">Today - Afternoon Slot (02:00 PM - 04:00 PM)</option>
                      <option value="Today - Evening Slot (05:00 PM - 08:00 PM)">Today - Evening Slot (05:00 PM - 08:00 PM)</option>
                      <option value="Tomorrow - Morning Regular Slot">Tomorrow - Morning Regular Slot</option>
                      <option value="Emergency Home Visit (Within 60 Mins)">Emergency Home Visit (Within 60 Mins)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Patient Phone *</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Visit Address *</label>
                  <textarea
                    required
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', marginBottom: '18px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px' }}>PAYMENT METHOD:</label>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#6b21a8' }}>
                      <input type="radio" name="doc_pay" value="Online Pay" checked={docPayMode === 'Online Pay'} onChange={() => setDocPayMode('Online Pay')} />
                      📱 Online PhonePe / Scanner (Q084564939@ybl)
                    </label>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                      <input type="radio" name="doc_pay" value="COD" checked={docPayMode === 'COD'} onChange={() => setDocPayMode('COD')} />
                      💵 Cash to Doctor on Visit
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: '100%', padding: '12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}
                >
                  Confirm Appointment with {selectedDoctor.name} ({formatDoctorFee(selectedDoctor.fee)}) ➔
                </button>
              </form>
            )}
          </div>
        )}

        {/* OXYGEN CYLINDERS */}
        {selectedMenu === 'oxygen' && (
          <div>
            <div style={{ marginBottom: '18px' }}>
              <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontWeight: 800 }}>🫁 Medical Oxygen Fleet</span>
              <h2 style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>Oxygen Cylinder Rentals & Refills</h2>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
              <button type="button" onClick={() => setActiveCylinderTab('rental')} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: activeCylinderTab === 'rental' ? '2.5px solid #0284c7' : '1px solid #cbd5e1', background: activeCylinderTab === 'rental' ? '#e0f2fe' : '#fff', fontWeight: 800, cursor: 'pointer' }}>📦 Cylinder / Concentrator Rental</button>
              <button type="button" onClick={() => setActiveCylinderTab('refill')} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: activeCylinderTab === 'refill' ? '2.5px solid #0284c7' : '1px solid #cbd5e1', background: activeCylinderTab === 'refill' ? '#e0f2fe' : '#fff', fontWeight: 800, cursor: 'pointer' }}>🔄 Doorstep Refill Swap</button>
            </div>
            {activeCylinderTab === 'rental' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '22px' }}>
                {RENTAL_CYLINDERS.map((c) => (
                  <div key={c.id} onClick={() => setSelectedRental(c)} style={{ background: '#fff', borderRadius: '10px', border: selectedRental.id === c.id ? '2.5px solid #0284c7' : '1px solid #cbd5e1', padding: '16px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Deposit: ₹{c.deposit}</span>
                      <strong style={{ color: '#0284c7' }}>₹{c.rate}/day</strong>
                    </div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 800 }}>{c.name}</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{c.desc}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '22px' }}>
                {REFILL_OPTIONS.map((r) => (
                  <div key={r.id} onClick={() => setSelectedRefill(r)} style={{ background: '#fff', borderRadius: '10px', border: selectedRefill.id === r.id ? '2.5px solid #0284c7' : '1px solid #cbd5e1', padding: '16px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 800 }}>⚡ {r.time}</span>
                      <strong style={{ color: '#0284c7' }}>₹{r.price}</strong>
                    </div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 800 }}>{r.name}</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{r.desc}</p>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleCylinderSubmit} style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Delivery Address *</label>
                <textarea required rows={2} value={address} onChange={(e) => setAddress(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px' }}>PAYMENT METHOD:</label>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#6b21a8' }}>
                    <input type="radio" name="cyl_pay" value="Online Pay" checked={activeCylinderTab === 'rental' ? rentalPayMode === 'Online Pay' : refillPayMode === 'Online Pay'} onChange={() => activeCylinderTab === 'rental' ? setRentalPayMode('Online Pay') : setRefillPayMode('Online Pay')} />
                    📱 Online PhonePe / Scanner (Q084564939@ybl)
                  </label>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                    <input type="radio" name="cyl_pay" value="COD" checked={activeCylinderTab === 'rental' ? rentalPayMode === 'COD' : refillPayMode === 'COD'} onChange={() => activeCylinderTab === 'rental' ? setRentalPayMode('COD') : setRefillPayMode('COD')} />
                    💵 Cash on Delivery
                  </label>
                </div>
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}>Proceed to Order Oxygen ➔</button>
            </form>
          </div>
        )}

        {/* HOME CARE */}
        {selectedMenu === 'homecare' && (
          <div>
            <div style={{ marginBottom: '18px' }}>
              <span style={{ fontSize: '11px', background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '4px', fontWeight: 800 }}>🏠 Verified Nurses</span>
              <h2 style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>Bedside Patient Attendants & Nurses</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '22px' }}>
              {HOME_CARE_SERVICES.map((s) => (
                <div key={s.id} onClick={() => setSelectedHomeCare(s)} style={{ background: '#fff', borderRadius: '10px', border: selectedHomeCare.id === s.id ? '2.5px solid #0284c7' : '1px solid #cbd5e1', padding: '16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 800 }}>✓ Verified</span>
                    <strong style={{ color: '#0284c7' }}>₹{s.ratePerDay}/shift</strong>
                  </div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 800 }}>{s.title}</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{s.desc}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleHomeCareSubmit} style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Care Address *</label>
                <textarea required rows={2} value={address} onChange={(e) => setAddress(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px' }}>PAYMENT METHOD:</label>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#6b21a8' }}>
                    <input type="radio" name="hc_pay" value="Online Pay" checked={hcPayMode === 'Online Pay'} onChange={() => setHcPayMode('Online Pay')} />
                    📱 Online PhonePe / Scanner (Q084564939@ybl)
                  </label>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                    <input type="radio" name="hc_pay" value="COD" checked={hcPayMode === 'COD'} onChange={() => setHcPayMode('COD')} />
                    💵 Pay on Duty / Cash
                  </label>
                </div>
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}>Proceed to Book Care ➔</button>
            </form>
          </div>
        )}

        {/* LAB DIAGNOSTICS */}
        {selectedMenu === 'diagnostics' && (
          <div>
            <div style={{ marginBottom: '18px' }}>
              <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontWeight: 800 }}>⚡ Rapid Lab Express</span>
              <h2 style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>Doorstep Blood Sample Collection</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '22px' }}>
              {DIAGNOSTIC_TESTS.map((t) => (
                <div key={t.id} onClick={() => setSelectedLabTest(t)} style={{ background: '#fff', borderRadius: '10px', border: selectedLabTest.id === t.id ? '2.5px solid #0284c7' : '1px solid #cbd5e1', padding: '16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: 800 }}>{t.badge}</span>
                    <strong style={{ color: '#0284c7' }}>₹{t.price}</strong>
                  </div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 800 }}>{t.name}</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{t.desc}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleLabSubmit} style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Collection Address *</label>
                <textarea required rows={2} value={address} onChange={(e) => setAddress(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px' }}>PAYMENT METHOD:</label>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#6b21a8' }}>
                    <input type="radio" name="lab_pay" value="Online Pay" checked={labPayMode === 'Online Pay'} onChange={() => setLabPayMode('Online Pay')} />
                    📱 Online PhonePe / Scanner (Q084564939@ybl)
                  </label>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                    <input type="radio" name="lab_pay" value="COD" checked={labPayMode === 'COD'} onChange={() => setLabPayMode('COD')} />
                    💵 Cash on Collection
                  </label>
                </div>
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}>Proceed to Book Test (₹{selectedLabTest.price}) ➔</button>
            </form>
          </div>
        )}

        {/* TRACK ORDERS */}
        {selectedMenu === 'my_orders' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900 }}>Track Your Orders</h2>
              <button onClick={fetchMyOrders} disabled={loadingOrders} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: loadingOrders ? 'wait' : 'pointer', opacity: loadingOrders ? 0.7 : 1 }}>
                {loadingOrders ? '⟳ Loading…' : '🔄 Refresh'}
              </button>
            </div>
            {ordersError ? (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', padding: '18px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontWeight: 800, marginBottom: '8px' }}>{ordersError}</div>
                <button onClick={fetchMyOrders} style={{ background: '#ea580c', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '7px', fontWeight: 700, cursor: 'pointer' }}>Try again</button>
              </div>
            ) : loadingOrders ? (
              <div>Loading records...</div>
            ) : myOrders.length === 0 ? (
              <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', textAlign: 'center', border: '1px solid #cbd5e1' }}>No active bookings found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {myOrders.map((o) => (
                  <div key={o.id} style={{ background: '#fff', borderRadius: '10px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800, color: '#0284c7' }}>{o.id}</span>
                      <span style={{ fontWeight: 800, fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#ecfdf5', color: '#047857' }}>{o.status}</span>
                    </div>
                    <h4 style={{ margin: '0 0 4px 0' }}>{o.item}</h4>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Billing: {o.amount} | {o.payment_mode}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

    </div>
  );
}
