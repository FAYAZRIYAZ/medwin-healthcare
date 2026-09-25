class AdminController < ApplicationController
  def reset_patient_data
    return unless require_admin!

    deleted_bookings = 0
    deleted_patients = 0
    deleted_notes = 0

    ActiveRecord::Base.transaction do
      deleted_bookings = Booking.delete_all
      patient_phones = User.where.not(role: "admin").where.not(phone: nil).pluck(:phone)
      deleted_notes = CrmNote.where(phone: patient_phones).delete_all if patient_phones.any?
      deleted_patients = User.where.not(role: "admin").delete_all
    end

    render json: {
      message: "Patient data cleared successfully.",
      deleted_bookings: deleted_bookings,
      deleted_patients: deleted_patients,
      deleted_notes: deleted_notes
    }, status: :ok
  rescue StandardError => e
    render json: { error: e.message }, status: :internal_server_error
  end
end
