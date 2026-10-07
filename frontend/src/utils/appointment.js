export const getVideoCallAvailability = (appointmentAt, now = Date.now()) => {
  const start = new Date(appointmentAt).getTime();
  if (!Number.isFinite(start)) return { available: false, label: 'Appointment time unavailable' };

  const openAt = start - 10 * 60 * 1000;
  const closeAt = start + 45 * 60 * 1000;
  if (now < openAt) {
    return {
      available: false,
      label: `Join opens ${new Date(appointmentAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata'
      })}`
    };
  }
  if (now > closeAt) return { available: false, label: 'Appointment call window has ended' };
  return { available: true, label: 'Join video consultation' };
};

export const formatAppointmentDateTime = (appointmentAt) => new Date(appointmentAt).toLocaleString('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata'
});

export const getVideoRoomUrl = (room) => `https://meet.jit.si/${encodeURIComponent(room)}`;
