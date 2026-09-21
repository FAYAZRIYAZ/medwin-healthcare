import React, { createContext, useContext, useState, useEffect } from 'react';

const DoctorContext = createContext();
const STORAGE_KEY = 'medwin_master_doctors_list';

const INITIAL_DOCTORS = [
  { id: 'doc-1', name: 'Fayaz', specialty: 'dental', fee: 450, phone: '9963616300', timing: '10:00 AM - 02:00 PM' },
  { id: 'doc-2', name: 'HASHEEM', specialty: 'HOMECARE', fee: 500, phone: '998950945', timing: '10:00 AM - 02:00 PM' },
  { id: 'doc-3', name: 'Dr. Rajesh K. Patel', specialty: 'Cardiologist & Emergency Care', fee: 800, phone: '9700088990', timing: '05:00 PM - 09:00 PM' }
];

export function DoctorProvider({ children }) {
  const [doctors, setDoctors] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_DOCTORS;
    } catch {
      return INITIAL_DOCTORS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doctors));
    window.dispatchEvent(new Event('storage'));
  }, [doctors]);

  const addDoctor = (docData) => {
    const newDoc = {
      ...docData,
      id: `doc-${Date.now()}`,
      fee: parseInt(docData.fee) || 800
    };
    setDoctors((prev) => [newDoc, ...prev]);
  };

  const removeDoctor = (id) => {
    setDoctors((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <DoctorContext.Provider value={{ doctors, addDoctor, removeDoctor }}>
      {children}
    </DoctorContext.Provider>
  );
}

export function useDoctors() {
  return useContext(DoctorContext);
}
