class AddVideoConsultationAppointmentsToBookings < ActiveRecord::Migration[8.1]
  def change
    add_reference :bookings, :doctor, foreign_key: true
    add_column :bookings, :appointment_at, :datetime
    add_column :bookings, :consultation_type, :string
    add_column :bookings, :patient_problem, :text
    add_column :bookings, :video_room, :string
    add_column :bookings, :payment_expires_at, :datetime

    add_index :bookings, [:doctor_id, :appointment_at],
      unique: true,
      where: "doctor_id IS NOT NULL AND appointment_at IS NOT NULL AND status NOT IN ('Cancelled', 'Expired', 'Completed')",
      name: "index_bookings_on_active_doctor_appointment"
  end
end
