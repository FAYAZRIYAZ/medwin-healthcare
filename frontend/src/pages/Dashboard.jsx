import { useState, useEffect } from 'react';
import API from '../api/client';

const TODAY_DATE = new Date().toISOString().slice(0, 10);
const YESTERDAY_DATE = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

export default function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('orders');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [reportDate, setReportDate] = useState(TODAY_DATE);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [doctorsList, setDoctorsList] = useState([]);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [viewDoctorDetails, setViewDoctorDetails] = useState(null);
  const [docForm, setDocForm] = useState({
    name: '',
    gender: 'Male',
    reg_number: 'TSMC/2026/001',
    specialty: 'General Physician',
    qualification: 'MBBS, MD',
    experience_years: '5',
    fee: '800',
    phone: '9848012345',
    timing: '10:00 AM - 02:00 PM'
  });

  const [actionError, setActionError] = useState('');

  const fetchBookings = async () => {
    try {
      const res = await API.get('/bookings');
      if (Array.isArray(res.data)) {
        const sorted = [...res.data].sort((a, b) => {
          const numA = parseInt((a.raw_id || a.id || 0).toString().replace(/\D/g, '')) || 0;
          const numB = parseInt((b.raw_id || b.id || 0).toString().replace(/\D/g, '')) || 0;
          return numB - numA;
        });
        setBookings(sorted);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const refreshWorkspace = async () => {
    setRefreshing(true);
    await Promise.all([fetchBookings(), fetchDoctors()]);
    setRefreshing(false);
  };

  const fetchDoctors = async () => {
    try {
      const res = await API.get('/doctors');
      if (Array.isArray(res.data)) setDoctorsList(res.data);
    } catch (err) {
      console.error('Failed to load doctors:', err);
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchBookings();
    fetchDoctors();
    const interval = setInterval(() => {
      fetchBookings();
      fetchDoctors();
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleUpdateStatus = async (orderOrId, newStatus) => {
    setActionError('');
    let idToSend = typeof orderOrId === 'object' ? (orderOrId.raw_id || orderOrId.id) : orderOrId;
    idToSend = idToSend.toString().replace(/\D/g, '');

    try {
      await API.put(`/bookings/${idToSend}`, new URLSearchParams({ status: newStatus }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      await fetchBookings();
    } catch (err) {
      console.error('Update error:', err);
      setActionError(`Error updating status: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleSelectChange = (order, newStatus) => {
    handleUpdateStatus(order, newStatus);
  };

  const handleSaveDoctor = async (e) => {
    e.preventDefault();
    if (!docForm.name.trim() || !docForm.phone.trim()) {
      alert('Doctor Name and Phone are required.');
      return;
    }

    try {
      await API.post('/doctors', docForm);
      await fetchDoctors();
      setShowDoctorModal(false);
      setDocForm({ name: '', gender: 'Male', reg_number: 'TSMC/2026/001', specialty: 'General Physician', qualification: 'MBBS, MD', experience_years: '5', fee: '800', phone: '9848012345', timing: '10:00 AM - 02:00 PM' });
      alert(`Doctor ${docForm.name} published successfully to patient portal!`);
    } catch (err) {
      alert(`Failed to save doctor: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleDeleteDoctor = async (id) => {
    if (!window.confirm('Permanently delete this doctor? They will vanish instantly from both admin and patient portals.')) return;
    try {
      await API.delete(`/doctors/${id}`);
      setDoctorsList((current) => current.filter((doctor) => doctor.id !== id));
    } catch (err) {
      alert(`Failed to delete doctor: ${err.response?.data?.error || err.message}`);
    }
  };

  const uniquePatients = Array.from(
    new Map(bookings.map((b) => [b.phone, { name: b.customer_name, phone: b.phone, address: b.delivery_address || b.deliveryAddress, totalOrders: bookings.filter(x => x.phone === b.phone).length }])).values()
  );

  const totalRevenue = bookings.reduce((acc, b) => {
    if (b.status === 'Approved' || b.status === 'Completed' || b.status === 'Delivered') {
      const amt = parseInt((b.amount || '0').toString().replace(/\D/g, '')) || 0;
      return acc + amt;
    }
    return acc;
  }, 0);

  const pendingRevenue = bookings.reduce((acc, b) => {
    if (b.status === 'Pending') {
      const amt = parseInt((b.amount || '0').toString().replace(/\D/g, '')) || 0;
      return acc + amt;
    }
    return acc;
  }, 0);

  const cylinderRentalsCount = bookings.filter(b => (b.booking_type || '').includes('cylinder') && (b.status !== 'Cancelled')).length;
  const doctorVisitsCount = bookings.filter(b => (b.booking_type || '').includes('doctor') && (b.status !== 'Cancelled')).length;
  const homeCareCount = bookings.filter(b => (b.booking_type || '').includes('homecare') && (b.status !== 'Cancelled')).length;
  const labTestsCount = bookings.filter(b => (b.booking_type || '').includes('diagnostics') && (b.status !== 'Cancelled')).length;

  const filteredBookings = bookings.filter((b) => {
    const matchesFilter = filter === 'all' || (b.booking_type || b.type) === filter;
    const matchesSearch = (b.customer_name || '').toLowerCase().includes(search.toLowerCase()) || (b.phone || '').includes(search) || (b.item || '').toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const reportBookings = bookings.filter((booking) => {
    if (!booking.created_at) return false;
    return new Date(booking.created_at).toISOString().slice(0, 10) === reportDate;
  });
  const reportRevenue = reportBookings.reduce((total, booking) => {
    if (['Approved', 'Completed', 'Delivered'].includes(booking.status)) {
      return total + (parseInt((booking.amount || '0').toString().replace(/\D/g, ''), 10) || 0);
    }
    return total;
  }, 0);
  const reportLabel = reportDate === TODAY_DATE
    ? 'Today'
    : reportDate === YESTERDAY_DATE
      ? 'Yesterday'
      : reportDate;
  const reportMessage = [
    `MEDWIN daily report - ${reportLabel}`,
    `Bookings: ${reportBookings.length}`,
    `Approved revenue: ₹${reportRevenue}`,
    `Pending: ${reportBookings.filter((booking) => booking.status === 'Pending').length}`,
    ...reportBookings.slice(0, 20).map((booking) => `${booking.customer_name} | ${booking.item} | ${booking.status} | ${booking.amount}`)
  ].join('\n');
  const reportWhatsAppUrl = `https://wa.me/919347832031?text=${encodeURIComponent(reportMessage)}`;

  return (
    <div className="admin-shell" style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      <header className={mobileMenuOpen ? 'admin-header mobile-menu-open' : 'admin-header'} style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', background: '#0284c7', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '18px', color: '#fff' }}>M+</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '18px', color: '#0f172a' }}>MEDWIN OPERATIONS DESK</div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Command Center • Roster • CRM & Financial Reports</div>
          </div>
        </div>

        <div className="admin-tabs" style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', gap: '4px', border: '1px solid #cbd5e1' }}>
          {[
            { id: 'orders', label: `📦 Dispatches (${bookings.length})` },
            { id: 'doctors', label: `👨‍⚕️ Doctors (${doctorsList.length})` },
            { id: 'crm', label: `📊 CRM (${uniquePatients.length})` },
            { id: 'reports', label: `📈 Day-Wise Reports` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setMobileMenuOpen(false);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === tab.id ? '#0284c7' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : '#475569',
                fontWeight: 800,
                fontSize: '12.5px',
                cursor: 'pointer',
                boxShadow: activeTab === tab.id ? '0 2px 5px rgba(2,132,199,0.2)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={refreshWorkspace} disabled={refreshing} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', padding: '8px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: refreshing ? 'wait' : 'pointer', opacity: refreshing ? 0.7 : 1 }}>
                    {refreshing ? '⟳ Updating…' : '🔄 Refresh'}
                  </button>
                  {lastUpdated && <span style={{ alignSelf: 'center', color: '#64748b', fontSize: '11px' }}>Live · {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
          <button onClick={onLogout} style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', padding: '8px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>Sign Out</button>
        </div>
      </header>

      <main className="admin-content" style={{ padding: '24px 28px', maxWidth: '1480px', margin: '0 auto' }}>
        <button
          type="button"
          className="admin-mobile-home"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open admin menu"
        >
          ☰ <span>Home</span>
        </button>
        {mobileMenuOpen && <button className="admin-menu-backdrop" aria-label="Close admin menu" onClick={() => setMobileMenuOpen(false)} />}
        
        {activeTab === 'orders' && (
          <div>
            {actionError && <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontWeight: 700 }}>{actionError}</div>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All Services' },
                  { id: 'diagnostics', label: '🔬 Lab' },
                  { id: 'homecare', label: '🏠 Care' },
                  { id: 'cylinder', label: '🫁 Oxygen' },
                  { id: 'doctor', label: '👨‍⚕️ Doctors' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFilter(t.id)}
                    style={{
                      background: filter === t.id ? '#0f172a' : '#ffffff',
                      color: filter === t.id ? '#ffffff' : '#475569',
                      border: filter === t.id ? '1px solid #0f172a' : '1px solid #cbd5e1',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search patient, phone, item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '260px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', outline: 'none' }}
              />
            </div>

            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '14px 16px' }}>Order ID</th>
                    <th style={{ padding: '14px 16px' }}>Patient Details</th>
                    <th style={{ padding: '14px 16px' }}>Service Booked</th>
                    <th style={{ padding: '14px 16px' }}>Delivery Address</th>
                    <th style={{ padding: '14px 16px' }}>Payment & UTR</th>
                    <th style={{ padding: '14px 16px' }}>Approval Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading dispatches...</td></tr>
                  ) : filteredBookings.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No records found.</td></tr>
                  ) : (
                    filteredBookings.map((b) => (
                      <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 900, color: '#0284c7' }}>{b.id}</div>
                          <span style={{ fontSize: '9px', background: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                            {(b.booking_type || b.type || 'ORDER').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{b.customer_name}</div>
                          <div style={{ fontSize: '11.5px', color: '#0284c7', fontFamily: 'monospace' }}>+91 {b.phone}</div>
                        </td>
                        <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>{b.item}</div>
                          <div style={{ fontSize: '11.5px', color: '#16a34a', fontWeight: 800, marginTop: '2px' }}>Billing: {b.amount}</div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '12px', color: '#475569', maxWidth: '180px' }}>
                          {b.delivery_address || b.deliveryAddress}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '12px' }}>
                          <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontWeight: 800, color: '#7c3aed' }}>{b.payment_mode}</div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <select
                            value={b.status}
                            onChange={(e) => handleSelectChange(b, e.target.value)}
                            style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '7px 10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', outline: 'none' }}
                          >
                            <option value="Pending">Pending Review</option>
                            <option value="Approved">Approved</option>
                            <option value="Delivered">Dispatched / Collected</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'doctors' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontWeight: 800 }}>SYNCED WITH PATIENT PORTAL</span>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Doctor Roster Management</h2>
              </div>
              <button onClick={() => setShowDoctorModal(true)} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(22,163,74,0.25)' }}>
                ➕ Create Complete Doctor Profile
              </button>
            </div>

            {doctorsList.length === 0 ? (
              <div style={{ background: '#ffffff', padding: '40px', borderRadius: '12px', textAlign: 'center', border: '1px solid #cbd5e1', color: '#64748b' }}>
                No doctor profiles registered. Create a doctor profile above to display them instantly on user portals.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
                {doctorsList.map((doc) => (
                  <div key={doc.id} style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '10px', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontWeight: 800 }}>VISIBLE TO USERS</span>
                        <strong style={{ color: '#0284c7', fontSize: '15px' }}>₹{doc.fee} / visit</strong>
                      </div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>{doc.name}</h3>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', marginBottom: '10px' }}>{doc.specialty}</div>
                      <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', fontSize: '12px', color: '#334155', border: '1px solid #e2e8f0' }}>
                        <div>🕒 Shift: {doc.timing || '10:00 AM - 02:00 PM'}</div>
                        <div>📞 Phone: +91 {doc.phone}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                      <button onClick={() => setViewDoctorDetails(doc)} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer' }}>View Dossier</button>
                      <button onClick={() => handleDeleteDoctor(doc.id)} style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}>🗑️ Delete & Hide</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'crm' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', background: '#f5f3ff', color: '#7c3aed', padding: '3px 8px', borderRadius: '4px', fontWeight: 800 }}>CRM PATIENT DIRECTORY</span>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Lead Tracking & History</h2>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '14px 16px' }}>Patient Name</th>
                    <th style={{ padding: '14px 16px' }}>Phone Number</th>
                    <th style={{ padding: '14px 16px' }}>Address</th>
                    <th style={{ padding: '14px 16px' }}>Total Bookings</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {uniquePatients.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No patient leads recorded.</td></tr>
                  ) : (
                    uniquePatients.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0f172a' }}>{p.name}</td>
                        <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#0284c7' }}>+91 {p.phone}</td>
                        <td style={{ padding: '14px 16px', color: '#475569' }}>{p.address || 'Hyderabad'}</td>
                        <td style={{ padding: '14px 16px' }}><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '10px', fontWeight: 800, fontSize: '11px' }}>{p.totalOrders} Orders</span></td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <a href={`https://wa.me/91${p.phone}?text=Hello%20${encodeURIComponent(p.name)},%20Medwin%20Healthcare%20CRM%20Desk%20here.`} target="_blank" rel="noreferrer" style={{ background: '#16a34a', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, textDecoration: 'none' }}>
                            💬 CRM WhatsApp
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
              <div>
              <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontWeight: 800 }}>ANALYTICS & LEDGERS</span>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Day-Wise & Historical Reports</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => setReportDate(TODAY_DATE)} style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '7px', background: reportLabel === 'Today' ? '#0284c7' : '#fff', color: reportLabel === 'Today' ? '#fff' : '#334155', fontWeight: 800, cursor: 'pointer' }}>Today</button>
                <button onClick={() => setReportDate(YESTERDAY_DATE)} style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '7px', background: reportLabel === 'Yesterday' ? '#0284c7' : '#fff', color: reportLabel === 'Yesterday' ? '#fff' : '#334155', fontWeight: 800, cursor: 'pointer' }}>Yesterday</button>
                <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} style={{ padding: '7px 9px', border: '1px solid #cbd5e1', borderRadius: '7px', color: '#334155' }} />
                <a href={reportWhatsAppUrl} target="_blank" rel="noreferrer" style={{ padding: '8px 12px', borderRadius: '7px', background: '#16a34a', color: '#fff', fontWeight: 800, fontSize: '12px', textDecoration: 'none' }}>💬 Send on WhatsApp</a>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 22px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>Daily Report: {reportLabel}</h3>
                <span style={{ color: '#64748b', fontSize: '12px' }}>{reportBookings.length} bookings · ₹{reportRevenue} approved revenue</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead><tr style={{ color: '#64748b', borderBottom: '1px solid #e2e8f0' }}><th style={{ padding: '9px' }}>Patient</th><th style={{ padding: '9px' }}>Service</th><th style={{ padding: '9px' }}>Amount</th><th style={{ padding: '9px' }}>Status</th></tr></thead>
                  <tbody>{reportBookings.length === 0 ? <tr><td colSpan={4} style={{ padding: '20px 9px', color: '#94a3b8', textAlign: 'center' }}>No bookings for this date.</td></tr> : reportBookings.map((booking) => <tr key={booking.id} style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '9px', fontWeight: 800 }}>{booking.customer_name}</td><td style={{ padding: '9px' }}>{booking.item}</td><td style={{ padding: '9px', color: '#16a34a', fontWeight: 800 }}>{booking.amount}</td><td style={{ padding: '9px' }}>{booking.status}</td></tr>)}</tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Total Approved Revenue</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#16a34a', marginTop: '6px' }}>₹{totalRevenue}</div>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Pending Collection</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#d97706', marginTop: '6px' }}>₹{pendingRevenue}</div>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Active Cylinder Rentals</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#0284c7', marginTop: '6px' }}>{cylinderRentalsCount} Tanks</div>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Doctor Consultations</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#7c3aed', marginTop: '6px' }}>{doctorVisitsCount} Visits</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '22px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>Service Volume Breakdown</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Oxygen Cylinders Booked</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{cylinderRentalsCount}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Doctor Appointments</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{doctorVisitsCount}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Home Nursing Services</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{homeCareCount}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Rapid Lab Diagnostics</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{labTestsCount}</div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {showDoctorModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '500px', width: '100%', padding: '28px', border: '1px solid #cbd5e1', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>Register Doctor Profile</h3>
            <form onSubmit={handleSaveDoctor}>
              <div style={{ marginBottom: '12px' }}><label style={{ fontSize: '11px', fontWeight: 800, color: '#334155' }}>NAME *</label><input type="text" required value={docForm.name} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} style={{ width: '100%', padding: '9px 12px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', borderRadius: '6px', boxSizing: 'border-box' }} /></div>
              <div style={{ marginBottom: '12px' }}><label style={{ fontSize: '11px', fontWeight: 800, color: '#334155' }}>REGISTRATION NUMBER *</label><input type="text" required value={docForm.reg_number} onChange={(e) => setDocForm({ ...docForm, reg_number: e.target.value })} style={{ width: '100%', padding: '9px 12px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', borderRadius: '6px', boxSizing: 'border-box' }} /></div>
              <div style={{ marginBottom: '12px' }}><label style={{ fontSize: '11px', fontWeight: 800, color: '#334155' }}>SPECIALTY *</label><input type="text" required value={docForm.specialty} onChange={(e) => setDocForm({ ...docForm, specialty: e.target.value })} style={{ width: '100%', padding: '9px 12px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', borderRadius: '6px', boxSizing: 'border-box' }} /></div>
              <div style={{ marginBottom: '12px' }}><label style={{ fontSize: '11px', fontWeight: 800, color: '#334155' }}>VISIT FEE (₹) *</label><input type="number" required value={docForm.fee} onChange={(e) => setDocForm({ ...docForm, fee: e.target.value })} style={{ width: '100%', padding: '9px 12px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', borderRadius: '6px', boxSizing: 'border-box' }} /></div>
              <div style={{ marginBottom: '18px' }}><label style={{ fontSize: '11px', fontWeight: 800, color: '#334155' }}>PHONE *</label><input type="tel" required maxLength={10} value={docForm.phone} onChange={(e) => setDocForm({ ...docForm, phone: e.target.value.replace(/\D/g, '') })} style={{ width: '100%', padding: '9px 12px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', borderRadius: '6px', boxSizing: 'border-box' }} /></div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowDoctorModal(false)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '10px', background: '#16a34a', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 900, cursor: 'pointer' }}>Save Doctor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewDoctorDetails && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '24px', border: '1px solid #cbd5e1' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{viewDoctorDetails.name}</h3>
            <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 700, marginBottom: '14px' }}>{viewDoctorDetails.specialty}</div>
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', color: '#334155' }}>
              <div><strong>Registration:</strong> {viewDoctorDetails.reg_number}</div>
              <div><strong>Qualifications:</strong> {viewDoctorDetails.qualification}</div>
              <div><strong>Phone:</strong> +91 {viewDoctorDetails.phone}</div>
              <div><strong>Timing:</strong> {viewDoctorDetails.timing}</div>
              <div><strong>Visit Fee:</strong> ₹{viewDoctorDetails.fee}</div>
            </div>
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button onClick={() => setViewDoctorDetails(null)} style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
