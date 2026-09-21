const STORAGE_KEY = 'medwin_master_doctors_list';

const DEFAULT_DOCTORS = [
  { id: 'doc-1', name: 'Fayaz', specialty: 'General Physician', fee: 800, phone: '9848012345', timing: '10:00 AM - 02:00 PM', reg_number: 'TSMC/2026/001', qualification: 'MBBS, MD' },
  { id: 'doc-2', name: 'israr', specialty: 'General Physician', fee: 800, phone: '9848012345', timing: '10:00 AM - 02:00 PM', reg_number: 'TSMC/2026/002', qualification: 'MBBS, MS' }
];

export const getDoctors = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DOCTORS));
      return DEFAULT_DOCTORS;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_DOCTORS;
  }
};

export const saveDoctor = (doctorData) => {
  const current = getDoctors();
  const newDoc = {
    ...doctorData,
    id: `doc-${Date.now()}`,
    fee: parseInt(doctorData.fee) || 800
  };
  const updated = [newDoc, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('storage'));
  return updated;
};

export const deleteDoctor = (id) => {
  const current = getDoctors();
  const updated = current.filter((d) => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('storage'));
  return updated;
};
