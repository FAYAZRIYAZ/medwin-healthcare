class Booking < ApplicationRecord
  validates :booking_type, :customer_name, :phone, :item, presence: true

  before_create :set_defaults

  private

  def set_defaults
    self.status ||= "Pending"
    self.deposit ||= "N/A" if deposit.blank?
  end
end