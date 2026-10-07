import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/client';
import { formatAppointmentDateTime, getVideoCallAvailability, getVideoRoomUrl } from '../utils/appointment';

const DIAGNOSTIC_TESTS = [
  { id: 'lab-master', name: 'MEDWIN Full Body Checkup', badge: '68 tests · Best value', category: 'Full body', price: 999, image: '/medwin-lab-full-body.svg', desc: 'A broad health screen covering liver, kidney, lipids, blood count, sugar and urine.', includes: 'Liver · Kidney · Lipid · CBC · Sugar · Urine' },
  { id: 'lab-cbp', name: 'Complete Blood Count (CBC)', badge: 'Popular blood test', category: 'Blood test', price: 299, image: '/medwin-lab-cbc.svg', desc: 'Checks hemoglobin, red and white blood cells, and platelet count.', includes: 'Hemoglobin · RBC · WBC · Platelets' },
  { id: 'lab-sugar', name: 'Diabetes Screening Profile', badge: 'Fasting required', category: 'Diabetes', price: 449, image: '/medwin-lab-diabetes.svg', desc: 'Fasting blood sugar with HbA1c for a longer-term glucose picture.', includes: 'Fasting blood sugar · HbA1c', fasting: true },
  { id: 'lab-thyroid', name: 'Thyroid Profile (T3, T4 & TSH)', badge: 'Hormone panel', category: 'Thyroid', price: 399, image: '/medwin-lab-thyroid.svg', desc: 'Measures T3, T4 and TSH levels as a thyroid screening panel.', includes: 'T3 · T4 · TSH' },
  { id: 'lab-elderly', name: 'Electrolytes & Kidney Panel', badge: 'Home collection', category: 'Senior care', price: 699, image: '/medwin-lab-kidney.svg', desc: 'A focused panel covering key electrolytes and kidney markers.', includes: 'Sodium · Potassium · Chloride · Urea · Creatinine' }
];

const DIAGNOSTIC_CATEGORIES = ['All tests', ...new Set(DIAGNOSTIC_TESTS.map((test) => test.category))];
const MEDWIN_CALL_NUMBER = '+919347832031';
const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};
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

const submitBooking = (payload) => API.post('/bookings', new URLSearchParams(payload), {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
  transformRequest: [(data) => data.toString()]
});

const getBookingError = (err) => {
  const serverError = err.response?.data?.error;
  const message = Array.isArray(serverError) ? serverError.join(', ') : serverError;
  return message || `Request failed (${err.response?.status || 'network error'}). Please try again.`;
};

export default function PatientPortal({ onLogout }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [selectedMenu, setSelectedMenu] = useState('home');

  const [myOrders, setMyOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  const [patientName] = useState(user.name || 'Fayaz');
  const [phone, setPhone] = useState(user.phone || '9347832031');
  const [address, setAddress] = useState(localStorage.getItem('saved_patient_address') || 'Hyderabad');

  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(availableDoctors[0] || null);
  const [doctorConsultationType, setDoctorConsultationType] = useState('online');
  const [doctorSpecialty, setDoctorSpecialty] = useState('All doctors');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(() => formatDateInput(new Date()));
  const [doctorSlots, setDoctorSlots] = useState([]);
  const [selectedAppointmentAt, setSelectedAppointmentAt] = useState('');
  const [loadingDoctorSlots, setLoadingDoctorSlots] = useState(false);
  const [doctorSlotsError, setDoctorSlotsError] = useState('');
  const [patientProblem, setPatientProblem] = useState('');
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [maxAppointmentDate] = useState(() => formatDateInput(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)));
  const [docPayMode, setDocPayMode] = useState('Online Pay');
  const formatDoctorFee = (fee) => `₹${fee.toString().replace(/^₹+/, '')}`;

  // Diagnostics State
  const [selectedLabTest, setSelectedLabTest] = useState(DIAGNOSTIC_TESTS[0]);
  const [labCategory, setLabCategory] = useState('All tests');
  const [labSearch, setLabSearch] = useState('');
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

  const loadDoctorSlots = useCallback(async (doctorId, date) => {
    setLoadingDoctorSlots(true);
    setDoctorSlotsError('');
    setDoctorSlots([]);
    setSelectedAppointmentAt('');
    try {
      const response = await API.get('/bookings/doctor_slots', { params: { doctor_id: doctorId, date } });
      const slots = Array.isArray(response.data.slots) ? response.data.slots : [];
      setDoctorSlots(slots);
      setSelectedAppointmentAt(slots[0]?.starts_at || '');
    } catch (err) {
      console.error('Failed to load doctor appointment slots:', err);
      setDoctorSlotsError(err.response?.data?.error || 'Available appointment times could not be loaded. Please retry.');
    } finally {
      setLoadingDoctorSlots(false);
    }
  }, []);

  const syncDoctors = useCallback(async (loadAvailability = false) => {
    try {
      const res = await API.get('/doctors');
      const fresh = Array.isArray(res.data) ? res.data : [];
      setAvailableDoctors(fresh);
      setSelectedDoctor((previous) => fresh.find((doctor) => doctor.id === previous?.id) || fresh[0] || null);
      if (loadAvailability && fresh.length) {
        const doctor = fresh.find((item) => item.id === selectedDoctor?.id) || fresh[0];
        loadDoctorSlots(doctor.id, appointmentDate);
      }
    } catch (err) {
      console.error('Failed to load doctors:', err);
    }
  }, [appointmentDate, loadDoctorSlots, selectedDoctor?.id]);

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
  }, [syncDoctors]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => clearInterval(interval);
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

  useEffect(() => {
    const handleBackToDashboard = () => setSelectedMenu('home');
    window.addEventListener('popstate', handleBackToDashboard);
    return () => window.removeEventListener('popstate', handleBackToDashboard);
  }, []);

  const openFeature = (featureId) => {
    window.history.pushState({ patientFeature: featureId }, '', window.location.href);
    setSelectedMenu(featureId);
    if (featureId === 'my_orders') fetchMyOrders();
    if (featureId === 'doctors') syncDoctors(true);
  };

  const handleDoctorSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoctor) return alert('Please select an active doctor.');
    if (!selectedAppointmentAt) return alert('Please choose an available appointment time.');
    const isOnlineConsultation = doctorConsultationType === 'online';
    if (!isOnlineConsultation && !address.trim()) return alert('Please enter visit address.');
    if (isOnlineConsultation && patientProblem.trim().length < 10) {
      return alert('Please describe the patient’s concern in at least 10 characters.');
    }

    const totalAmount = formatDoctorFee(selectedDoctor.fee);
    const consultationLabel = isOnlineConsultation ? 'Online Video Consultation' : 'Doctor Home Visit';
    const appointmentLabel = formatAppointmentDateTime(selectedAppointmentAt);
    const itemTitle = `${consultationLabel}: ${selectedDoctor.name} [${selectedDoctor.specialty}] - ${appointmentLabel}`;

    const payload = {
      booking_type: 'doctor',
      doctor_id: selectedDoctor.id,
      appointment_at: selectedAppointmentAt,
      consultation_type: isOnlineConsultation ? 'online' : 'home_visit',
      patient_problem: isOnlineConsultation ? patientProblem.trim() : '',
      customer_name: patientName,
      phone: phone,
      item: itemTitle,
      delivery_address: isOnlineConsultation ? 'Online video consultation' : address,
      amount: totalAmount,
      deposit: 'N/A',
      doctor_time_slot: appointmentLabel,
      payment_expires_at: docPayMode === 'Online Pay'
        ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
        : ''
    };

    setLoading(true);
    try {
      const response = await submitBooking({
        ...payload,
        payment_mode: docPayMode === 'Online Pay'
          ? 'Awaiting online payment'
          : isOnlineConsultation ? 'Pay after video consultation' : 'Cash to Doctor on Visit',
        status: 'Pending',
        payment_expires_at: payload.payment_expires_at
      });
      if (docPayMode === 'Online Pay') {
        navigate('/payment', {
          state: {
            item: itemTitle,
            customerName: patientName,
            amount: totalAmount,
            bookingPayload: payload,
            existingBookingId: response.data.raw_id
          }
        });
      } else {
        alert(`Appointment request sent for ${selectedDoctor.name}. MEDWIN will confirm your scheduled consultation.`);
        fetchMyOrders();
        setSelectedMenu('my_orders');
      }
    } catch (err) {
      alert('Could not reserve this appointment: ' + getBookingError(err));
      loadDoctorSlots(selectedDoctor.id, appointmentDate);
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
      await submitBooking({ ...payload, payment_mode: 'Cash on Delivery (COD)', status: 'Pending' });
      alert('Oxygen booking confirmed!');
      fetchMyOrders();
      setSelectedMenu('my_orders');
    } catch (err) {
      alert('Failed: ' + getBookingError(err));
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
      await submitBooking({ ...payload, payment_mode: 'Cash on Duty', status: 'Pending' });
      alert('Home care requested!');
      fetchMyOrders();
      setSelectedMenu('my_orders');
    } catch (err) {
      alert('Failed: ' + getBookingError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLabSubmit = async (e) => {
    e.preventDefault();
    if (!address.trim()) return alert('Please enter delivery address.');

    const labSlot = selectedLabTest.fasting ? '07:30 AM - Morning Fasting' : '07:30 AM - Morning Slot';
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
      await submitBooking({ ...payload, payment_mode: 'Cash on Collection', status: 'Pending' });
      alert('Lab collection confirmed!');
      fetchMyOrders();
      setSelectedMenu('my_orders');
    } catch (err) {
      alert('Failed: ' + getBookingError(err));
    } finally {
      setLoading(false);
    }
  };

  const filteredDiagnosticTests = DIAGNOSTIC_TESTS.filter((test) => (
    (labCategory === 'All tests' || test.category === labCategory)
    && `${test.name} ${test.desc} ${test.category}`.toLowerCase().includes(labSearch.trim().toLowerCase())
  ));
  const doctorSpecialties = ['All doctors', ...new Set(availableDoctors.map((doctor) => doctor.specialty).filter(Boolean))];
  const filteredDoctors = availableDoctors.filter((doctor) => (
    (doctorSpecialty === 'All doctors' || doctor.specialty === doctorSpecialty)
    && `${doctor.name} ${doctor.specialty} ${doctor.qualification || ''}`.toLowerCase().includes(doctorSearch.trim().toLowerCase())
  ));

  return (
    <div className="patient-shell patient-shell-simple" style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header className="patient-topbar">
        <button type="button" className="patient-brand" onClick={() => setSelectedMenu('home')} aria-label="Open patient services">
          <span className="patient-brand-mark">M+</span>
          <span>
            <strong>MEDWIN HEALTH</strong>
            <small>Hyderabad Home Care</small>
          </span>
        </button>
        <div className="patient-topbar-actions">
          <div className="patient-user-summary">
            <span>LOGGED IN PATIENT</span>
            <strong>{patientName}</strong>
            <small>+91 {phone}</small>
          </div>
          <button onClick={onLogout} className="patient-signout" aria-label="Sign out">
            ↪ Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="patient-content patient-content-simple" style={{ padding: '28px', maxWidth: '1180px', margin: '0 auto', width: '100%' }}>
        {selectedMenu === 'home' && (
          <div className="patient-dashboard">
            <div className="patient-dashboard-hero">
              <div>
                <span className="patient-dashboard-eyebrow">MEDWIN HEALTHCARE</span>
                <h1>How can we help you today?</h1>
                <p>Book trusted healthcare services from one simple dashboard.</p>
              </div>
              <div className="patient-dashboard-hero-icon" aria-hidden="true">✚</div>
            </div>

            <div className="patient-dashboard-heading">
              <div>
                <span className="patient-dashboard-eyebrow">PATIENT SERVICES</span>
                <h2>Choose a service</h2>
              </div>
              <span className="patient-dashboard-status">● Services available</span>
            </div>

            <div className="patient-feature-grid">
              {[
                { id: 'doctors', icon: '👨‍⚕️', title: 'Consult a Doctor', text: 'Book a video consultation or doctor home visit.', tone: 'blue' },
                { id: 'oxygen', icon: '🫁', title: 'Oxygen Support', text: 'Rent cylinders or request a refill.', tone: 'mint' },
                { id: 'homecare', icon: '🏠', title: 'Home Nursing Care', text: 'Get trained care at your doorstep.', tone: 'peach' },
                { id: 'diagnostics', icon: '🔬', title: 'Lab Tests & Checkups', text: 'Browse MEDWIN packages and request home collection.', tone: 'violet' },
                { id: 'my_orders', icon: '📦', title: 'Track Bookings', text: `${myOrders.length} booking${myOrders.length === 1 ? '' : 's'} in your account.`, tone: 'slate' }
              ].map((feature) => (
                <button
                  key={feature.id}
                  type="button"
                  className={`patient-feature-card patient-feature-${feature.tone}`}
                  onClick={() => openFeature(feature.id)}
                >
                  <span className="patient-feature-icon" aria-hidden="true">{feature.icon}</span>
                  <span className="patient-feature-title">{feature.title}</span>
                  <span className="patient-feature-text">{feature.text}</span>
                  <span className="patient-feature-link">Open service <span aria-hidden="true">→</span></span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* DOCTORS SELECTION */}
        {selectedMenu === 'doctors' && (
          <div className="patient-doctors">
            <section className="doctor-hero">
              <div className="doctor-hero-content">
                <span className="doctor-eyebrow">MEDWIN DOCTOR CARE</span>
                <h2>Talk to a doctor, your way</h2>
                <p>Book a scheduled video call with a MEDWIN doctor or request a home visit.</p>
                <div className="doctor-hero-points">
                  <span>✓ Choose from the MEDWIN doctor roster</span>
                  <span>✓ See the listed fee before booking</span>
                  <span>✓ MEDWIN confirms your requested appointment</span>
                </div>
              </div>
              <img src="/medwin-doctor-hero.svg" alt="" />
            </section>

            <div className="doctor-mode-picker" aria-label="Choose consultation type">
              <button
                type="button"
                className={doctorConsultationType === 'online' ? 'is-active' : ''}
                aria-pressed={doctorConsultationType === 'online'}
                onClick={() => {
                  setDoctorConsultationType('online');
                }}
              >
                <span aria-hidden="true">☎</span>
                <span><strong>Online video consultation</strong><small>30-minute video call · Join from Track Bookings after approval</small></span>
              </button>
              <button
                type="button"
                className={doctorConsultationType === 'home' ? 'is-active' : ''}
                aria-pressed={doctorConsultationType === 'home'}
                onClick={() => {
                  setDoctorConsultationType('home');
                }}
              >
                <span aria-hidden="true">⌂</span>
                <span><strong>Doctor home visit</strong><small>Request an in-person visit to your address</small></span>
              </button>
            </div>

            <section className="doctor-catalog" aria-labelledby="doctor-catalog-title">
              <div className="doctor-catalog-heading">
                <div>
                  <span className="doctor-eyebrow">MEDWIN DOCTORS</span>
                  <h3 id="doctor-catalog-title">Choose a doctor</h3>
                </div>
                <label className="doctor-search">
                  <span aria-hidden="true">⌕</span>
                  <input
                    type="search"
                    value={doctorSearch}
                    onChange={(event) => setDoctorSearch(event.target.value)}
                    placeholder="Search doctor or specialty"
                    aria-label="Search doctor or specialty"
                  />
                </label>
              </div>

              {doctorSpecialties.length > 2 && (
                <div className="doctor-specialties" aria-label="Filter doctors by specialty">
                  {doctorSpecialties.map((specialty) => (
                    <button
                      type="button"
                      key={specialty}
                      className={doctorSpecialty === specialty ? 'is-active' : ''}
                      aria-pressed={doctorSpecialty === specialty}
                      onClick={() => setDoctorSpecialty(specialty)}
                    >
                      {specialty}
                    </button>
                  ))}
                </div>
              )}

              {availableDoctors.length === 0 ? (
                <div className="doctor-empty">
                  <img src="/medwin-doctor-avatar.svg" alt="" />
                  <strong>Doctor list is temporarily unavailable</strong>
                  <p>Check your connection and try loading the MEDWIN roster again.</p>
                  <button type="button" onClick={syncDoctors}>Retry</button>
                </div>
              ) : filteredDoctors.length === 0 ? (
                <p className="doctor-no-results">No doctors match your search. Try a different name or specialty.</p>
              ) : (
                <div className="doctor-grid">
                  {filteredDoctors.map((doctor) => {
                    const isSelected = selectedDoctor && (selectedDoctor.id === doctor.id || selectedDoctor.name === doctor.name);
                    return (
                      <button
                        type="button"
                        key={doctor.id || doctor.name}
                        className={`doctor-card ${isSelected ? 'is-selected' : ''}`}
                        aria-pressed={Boolean(isSelected)}
                        onClick={() => {
                          setSelectedDoctor(doctor);
                          loadDoctorSlots(doctor.id, appointmentDate);
                        }}
                      >
                        <span className="doctor-card-profile">
                          <img
                            src={doctor.image_url || '/medwin-doctor-avatar.svg'}
                            alt=""
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = '/medwin-doctor-avatar.svg';
                            }}
                          />
                          <span className="doctor-card-availability"><i /> Listed by MEDWIN</span>
                        </span>
                        <span className="doctor-card-name">{doctor.name}</span>
                        <span className="doctor-card-specialty">{doctor.specialty || 'General Physician'}</span>
                        <span className="doctor-card-qualification">{doctor.qualification || 'MEDWIN doctor roster'}</span>
                        {doctor.experience && <span className="doctor-card-experience">{doctor.experience} experience</span>}
                        <span className="doctor-card-footer">
                          <span><small>{doctorConsultationType === 'online' ? 'Consultation fee' : 'Home visit fee'}</small><strong>{formatDoctorFee(doctor.fee)}</strong></span>
                          <span className="doctor-card-select">{isSelected ? 'Selected ✓' : 'View & book →'}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {selectedDoctor && filteredDoctors.some((doctor) => doctor.id === selectedDoctor.id || doctor.name === selectedDoctor.name) && (
              <form onSubmit={handleDoctorSubmit} className="doctor-booking">
                <div className="doctor-booking-summary">
                  <span className="doctor-eyebrow">YOUR APPOINTMENT</span>
                  <h3>{selectedDoctor.name}</h3>
                  <p>{selectedDoctor.specialty || 'General Physician'} · {doctorConsultationType === 'online' ? 'Online video consultation' : 'Doctor home visit'}</p>
                  <strong>{formatDoctorFee(selectedDoctor.fee)}</strong>
                </div>
                <div className="doctor-booking-fields">
                  <label htmlFor="doctor-appointment-date">Choose an appointment date *</label>
                  <input
                    id="doctor-appointment-date"
                    type="date"
                    required
                    min={formatDateInput(new Date())}
                    max={maxAppointmentDate}
                    value={appointmentDate}
                    onChange={(event) => {
                      setAppointmentDate(event.target.value);
                      loadDoctorSlots(selectedDoctor.id, event.target.value);
                    }}
                  />

                  <span className="doctor-slot-label">Available 30-minute times · Asia/Kolkata</span>
                  {loadingDoctorSlots ? (
                    <p className="doctor-slots-message" role="status">Checking the live MEDWIN schedule…</p>
                  ) : doctorSlotsError ? (
                    <div className="doctor-slots-error" role="alert">
                      <span>{doctorSlotsError}</span>
                      <button type="button" onClick={() => loadDoctorSlots(selectedDoctor.id, appointmentDate)}>Retry</button>
                    </div>
                  ) : doctorSlots.length === 0 ? (
                    <p className="doctor-slots-message">No times are available on this date. Choose another date.</p>
                  ) : (
                    <div className="doctor-slot-grid" role="group" aria-label="Available appointment times">
                      {doctorSlots.map((slot) => (
                        <button
                          type="button"
                          key={slot.starts_at}
                          className={selectedAppointmentAt === slot.starts_at ? 'is-selected' : ''}
                          aria-pressed={selectedAppointmentAt === slot.starts_at}
                          onClick={() => setSelectedAppointmentAt(slot.starts_at)}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <label htmlFor="doctor-phone">Patient phone *</label>
                  <input
                    id="doctor-phone"
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))}
                  />

                  {doctorConsultationType === 'home' && (
                    <>
                      <label htmlFor="doctor-visit-address">Home visit address *</label>
                      <textarea
                        id="doctor-visit-address"
                        required
                        rows={3}
                        value={address}
                        onChange={(event) => setAddress(event.target.value)}
                        placeholder="Enter the address for the doctor visit"
                      />
                    </>
                  )}

                  {doctorConsultationType === 'online' && (
                    <>
                      <label htmlFor="doctor-problem">What would you like the doctor to help with? *</label>
                      <textarea
                        id="doctor-problem"
                        required
                        minLength={10}
                        maxLength={2000}
                        rows={4}
                        value={patientProblem}
                        onChange={(event) => setPatientProblem(event.target.value)}
                        placeholder="Describe symptoms, how long they have been present, and any relevant context. Avoid including information you do not want shared during your consultation."
                      />
                      <span className="doctor-problem-count">{patientProblem.length}/2000 characters</span>
                      <p className="doctor-call-note">Your request reserves one 30-minute slot for this doctor. Once MEDWIN approves it, you and the doctor can join the same unique Jitsi Meet room. Video calls are hosted by Jitsi, an external provider.</p>
                    </>
                  )}

                  <fieldset className="doctor-payment">
                    <legend>Payment method</legend>
                    <label>
                      <input type="radio" name="doc_pay" value="Online Pay" checked={docPayMode === 'Online Pay'} onChange={() => setDocPayMode('Online Pay')} />
                      <span><strong>Pay online</strong><small>PhonePe / UPI at checkout</small></span>
                    </label>
                    <label>
                      <input type="radio" name="doc_pay" value="COD" checked={docPayMode === 'COD'} onChange={() => setDocPayMode('COD')} />
                      <span><strong>{doctorConsultationType === 'online' ? 'Pay after consultation' : 'Cash on visit'}</strong><small>{doctorConsultationType === 'online' ? 'Payment arranged with MEDWIN' : 'Pay the doctor at your home visit'}</small></span>
                    </label>
                  </fieldset>

                  <button type="submit" disabled={loading} className="doctor-book-button">
                    {loading ? 'Reserving appointment…' : `Reserve appointment · ${formatDoctorFee(selectedDoctor.fee)}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* OXYGEN CYLINDERS */}
        {selectedMenu === 'oxygen' && (
          <div className="patient-services patient-oxygen">
            <section className="service-hero">
              <div>
                <span className="service-eyebrow">MEDWIN OXYGEN SUPPORT</span>
                <h2>Oxygen equipment, delivered to your home</h2>
                <p>Compare available rentals and refill swaps. MEDWIN will confirm delivery after your request.</p>
              </div>
              <img src="/medwin-oxygen-hero.svg" alt="" />
            </section>
            <div className="service-tabs" aria-label="Choose oxygen service">
              <button type="button" className={activeCylinderTab === 'rental' ? 'is-active' : ''} aria-pressed={activeCylinderTab === 'rental'} onClick={() => setActiveCylinderTab('rental')}>Cylinder / concentrator rental</button>
              <button type="button" className={activeCylinderTab === 'refill' ? 'is-active' : ''} aria-pressed={activeCylinderTab === 'refill'} onClick={() => setActiveCylinderTab('refill')}>Doorstep refill swap</button>
            </div>
            {activeCylinderTab === 'rental' ? (
              <div className="service-options-grid">
                {RENTAL_CYLINDERS.map((c) => (
                  <button type="button" key={c.id} onClick={() => setSelectedRental(c)} aria-pressed={selectedRental.id === c.id} className={`service-option-card ${selectedRental.id === c.id ? 'is-selected' : ''}`}>
                    <span className="service-option-meta"><span>Refundable deposit: ₹{c.deposit}</span><strong>₹{c.rate}/day</strong></span>
                    <strong className="service-option-name">{c.name}</strong>
                    <span className="service-option-description">{c.desc}</span>
                    <span className="service-option-action">{selectedRental.id === c.id ? 'Selected ✓' : 'Select equipment →'}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="service-options-grid">
                {REFILL_OPTIONS.map((r) => (
                  <button type="button" key={r.id} onClick={() => setSelectedRefill(r)} aria-pressed={selectedRefill.id === r.id} className={`service-option-card ${selectedRefill.id === r.id ? 'is-selected' : ''}`}>
                    <span className="service-option-meta"><span>Estimated delivery: {r.time}</span><strong>₹{r.price}</strong></span>
                    <strong className="service-option-name">{r.name}</strong>
                    <span className="service-option-description">{r.desc}</span>
                    <span className="service-option-action">{selectedRefill.id === r.id ? 'Selected ✓' : 'Select refill →'}</span>
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={handleCylinderSubmit} className="patient-service-form" style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
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
          <div className="patient-services patient-homecare">
            <section className="service-hero">
              <div>
                <span className="service-eyebrow">MEDWIN HOME CARE</span>
                <h2>Care and support in familiar surroundings</h2>
                <p>Compare available nursing and attendant shifts, then request care at your home.</p>
              </div>
              <img src="/medwin-homecare-hero.svg" alt="" />
            </section>
            <div className="service-options-grid homecare-options">
              {HOME_CARE_SERVICES.map((s) => (
                <button type="button" key={s.id} onClick={() => setSelectedHomeCare(s)} aria-pressed={selectedHomeCare.id === s.id} className={`service-option-card ${selectedHomeCare.id === s.id ? 'is-selected' : ''}`}>
                  <span className="service-option-meta"><span>MEDWIN care service</span><strong>₹{s.ratePerDay}/shift</strong></span>
                  <strong className="service-option-name">{s.title}</strong>
                  <span className="service-option-description">{s.desc}</span>
                  <span className="service-option-action">{selectedHomeCare.id === s.id ? 'Selected ✓' : 'Select care option →'}</span>
                </button>
              ))}
            </div>
            <form onSubmit={handleHomeCareSubmit} className="patient-service-form" style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
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
          <div className="patient-diagnostics">
            <section className="diagnostics-hero">
              <div className="diagnostics-hero-content">
                <span className="diagnostics-eyebrow">MEDWIN LAB SERVICES</span>
                <h2>Health tests, at your doorstep</h2>
                <p>Choose a test or checkup package and request a home sample collection.</p>
                <label className="diagnostics-search">
                  <span aria-hidden="true">⌕</span>
                  <input
                    type="search"
                    value={labSearch}
                    onChange={(event) => setLabSearch(event.target.value)}
                    placeholder="Search tests and checkup packages"
                    aria-label="Search tests and checkup packages"
                  />
                </label>
                <div className="diagnostics-benefits">
                  <span>⌂ Home sample collection</span>
                  <span>✓ Upfront package prices</span>
                  <span>▣ Track your booking in MEDWIN</span>
                </div>
                <a className="diagnostics-call-link" href={`tel:${MEDWIN_CALL_NUMBER}`}>
                  <span aria-hidden="true">☎</span>
                  <span><strong>Prefer to book by phone?</strong><small>Call MEDWIN · +91 93478 32031</small></span>
                </a>
              </div>
              <figure className="diagnostics-hero-figure">
                <img className="diagnostics-hero-image" src="/medwin-diagnostic-lab.jpg" alt="Blood sample being processed in a clinical laboratory" />
                <figcaption>
                  Photo: Goleisureintl · <a href="https://commons.wikimedia.org/wiki/File:NABL_Accredited_Clinical_Pathology_Laboratory_in_Kharghar_Navi_Mumbai_Diagnostic_Services.jpg" target="_blank" rel="noreferrer">source</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>
                </figcaption>
              </figure>
            </section>

            <section className="diagnostics-catalog" aria-labelledby="diagnostics-list-title">
              <div className="diagnostics-section-heading">
                <div>
                  <span className="diagnostics-eyebrow">TESTS & PACKAGES</span>
                  <h3 id="diagnostics-list-title">Find the right test for you</h3>
                </div>
                <span className="diagnostics-result-count">
                  {filteredDiagnosticTests.length} {filteredDiagnosticTests.length === 1 ? 'option' : 'options'}
                </span>
              </div>
              <div className="diagnostics-categories" aria-label="Filter test categories">
                {DIAGNOSTIC_CATEGORIES.map((category) => (
                  <button
                    type="button"
                    key={category}
                    className={labCategory === category ? 'is-active' : ''}
                    aria-pressed={labCategory === category}
                    onClick={() => setLabCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="diagnostics-grid">
                {filteredDiagnosticTests.map((test) => (
                  <button
                    type="button"
                    key={test.id}
                    className={`diagnostics-card ${selectedLabTest.id === test.id ? 'is-selected' : ''}`}
                    aria-pressed={selectedLabTest.id === test.id}
                    onClick={() => setSelectedLabTest(test)}
                  >
                    <span className="diagnostics-card-image">
                      <img src={test.image} alt="" loading="lazy" />
                    </span>
                    <span className="diagnostics-card-top">
                      <span className="diagnostics-badge">{test.badge}</span>
                      <span className="diagnostics-price">₹{test.price}</span>
                    </span>
                    <span className="diagnostics-test-name">{test.name}</span>
                    <span className="diagnostics-test-description">{test.desc}</span>
                    <span className="diagnostics-includes"><strong>Includes:</strong> {test.includes}</span>
                    <span className="diagnostics-card-footer">
                      {test.fasting ? 'Fasting sample' : 'Home collection'}
                      <span>{selectedLabTest.id === test.id ? 'Selected ✓' : 'Select test →'}</span>
                    </span>
                  </button>
                ))}
                {filteredDiagnosticTests.length === 0 && (
                  <p className="diagnostics-empty">No tests match that search. Try another test name or category.</p>
                )}
              </div>
            </section>

            <section className="diagnostics-booking" aria-labelledby="diagnostics-book-title">
              <div className="diagnostics-booking-summary">
                <span className="diagnostics-eyebrow">YOUR SELECTION</span>
                <h3 id="diagnostics-book-title">{selectedLabTest.name}</h3>
                <p>{selectedLabTest.fasting ? 'Collection is scheduled for a morning fasting slot.' : 'MEDWIN will arrange a morning home collection.'}</p>
                <strong>₹{selectedLabTest.price}</strong>
                <a className="diagnostics-call-button" href={`tel:${MEDWIN_CALL_NUMBER}`}>
                  ☎ Call to book · +91 93478 32031
                </a>
              </div>
              <form onSubmit={handleLabSubmit} className="diagnostics-booking-form">
                <label htmlFor="lab-collection-address">Home collection address *</label>
                <textarea
                  id="lab-collection-address"
                  required
                  rows={3}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Enter your complete address"
                />
                <fieldset className="diagnostics-payment">
                  <legend>Payment method</legend>
                  <label>
                    <input type="radio" name="lab_pay" value="Online Pay" checked={labPayMode === 'Online Pay'} onChange={() => setLabPayMode('Online Pay')} />
                    <span><strong>Pay online</strong><small>PhonePe / UPI at checkout</small></span>
                  </label>
                  <label>
                    <input type="radio" name="lab_pay" value="COD" checked={labPayMode === 'COD'} onChange={() => setLabPayMode('COD')} />
                    <span><strong>Cash on collection</strong><small>Pay when the sample is collected</small></span>
                  </label>
                </fieldset>
                <button type="submit" disabled={loading} className="diagnostics-submit">
                  {loading ? 'Submitting request…' : `Continue to book · ₹${selectedLabTest.price}`}
                </button>
              </form>
            </section>

            <p className="diagnostics-note">Preparation and collection timing will be confirmed by MEDWIN after your request.</p>
            <a className="diagnostics-mobile-call" href={`tel:${MEDWIN_CALL_NUMBER}`}>
              <span>☎</span><span><strong>Book via call</strong><small>+91 93478 32031</small></span>
            </a>
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
                {myOrders.map((o) => {
                  const videoAppointment = o.consultation_type === 'online' && o.video_room && o.appointment_at;
                  const videoAvailability = videoAppointment ? getVideoCallAvailability(o.appointment_at, currentTime) : null;
                  return (
                    <div key={o.id} className="patient-order-card">
                      <div className="patient-order-heading">
                        <span>{o.id}</span>
                        <span>{o.status}</span>
                      </div>
                      <h4>{o.item}</h4>
                      <div className="patient-order-details">
                        Billing: {o.amount} | {o.payment_mode}
                        {o.appointment_at && (
                          <span>
                            Appointment: {formatAppointmentDateTime(o.appointment_at)} IST
                          </span>
                        )}
                      </div>
                      {o.consultation_type === 'online' && o.patient_problem && (
                        <p className="patient-order-problem"><strong>Your concern:</strong> {o.patient_problem}</p>
                      )}
                      {videoAppointment && (
                        <section className="patient-video-panel" aria-label="Video consultation">
                          <div className="patient-video-panel-copy">
                            <strong>Video consultation</strong>
                            <span>{o.status === 'Approved' ? videoAvailability.label : 'Your video call link appears here after MEDWIN approves your appointment.'}</span>
                          </div>
                          {o.status === 'Approved' && videoAvailability.available ? (
                            <a className="patient-video-join" href={getVideoRoomUrl(o.video_room)} target="_blank" rel="noreferrer">
                              Join video call ↗
                            </a>
                          ) : (
                            <button className="patient-video-join is-disabled" type="button" disabled>
                              {o.status === 'Approved' ? 'Join not available yet' : 'Waiting for approval'}
                            </button>
                          )}
                          <small>Calls use Jitsi Meet, an external video provider.</small>
                        </section>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

    </div>
  );
}
