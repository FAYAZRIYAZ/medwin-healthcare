class Booking < ApplicationRecord
  validates :booking_type, :customer_name, :phone, :item, presence: true
  validates :consultation_type, inclusion: { in: %w[online home_visit] }, if: :doctor_appointment?
  validates :patient_problem, presence: true, length: { maximum: 2000 }, if: :online_consultation?
  validates :doctor_id, :appointment_at, presence: true, if: :doctor_appointment?
  validates :appointment_at, uniqueness: {
    scope: :doctor_id,
    conditions: -> { where.not(status: %w[Cancelled Expired Completed]) },
    message: "has already been booked"
  }, if: :appointment_slot_changed?
  validate :appointment_at_uses_an_available_slot, if: :appointment_slot_changed?

  before_create :set_defaults
  before_validation :assign_video_room, on: :create

  private

  def doctor_appointment?
    booking_type == "doctor"
  end

  def online_consultation?
    doctor_appointment? && consultation_type == "online"
  end

  def appointment_slot_changed?
    doctor_appointment? && (new_record? || will_save_change_to_doctor_id? || will_save_change_to_appointment_at?)
  end

  def assign_video_room
    self.video_room ||= "MEDWIN-#{SecureRandom.hex(20)}" if online_consultation?
  end

  def appointment_at_uses_an_available_slot
    return if appointment_at.blank?

    local_time = appointment_at.in_time_zone
    valid_time = local_time.sec.zero? &&
      [0, 30].include?(local_time.min) &&
      (9..18).cover?(local_time.hour) &&
      !(local_time.hour == 18 && local_time.min.zero?)

    errors.add(:appointment_at, "must be a 30-minute MEDWIN appointment slot between 9:00 AM and 7:00 PM") unless valid_time
    errors.add(:appointment_at, "must be within the next 14 days") unless appointment_at.between?(Time.current, 14.days.from_now.end_of_day)
  end

  def set_defaults
    self.status ||= "Pending"
    self.deposit ||= "N/A" if deposit.blank?
  end
end