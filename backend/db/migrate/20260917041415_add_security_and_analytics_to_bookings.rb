class AddSecurityAndAnalyticsToBookings < ActiveRecord::Migration[8.1]
  def change
    add_column :bookings, :ip_address, :string
    add_column :bookings, :duration_days, :integer
    add_column :bookings, :cancellation_fee, :string
    add_column :bookings, :refund_amount, :string
    add_column :bookings, :doctor_time_slot, :string
  end
end
