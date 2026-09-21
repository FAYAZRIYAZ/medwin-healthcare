class CreateBookings < ActiveRecord::Migration[8.1]
  def change
    create_table :bookings do |t|
      t.string :booking_type
      t.string :customer_name
      t.string :phone
      t.string :item
      t.string :delivery_address
      t.string :payment_mode
      t.string :amount
      t.string :deposit
      t.string :status

      t.timestamps
    end
  end
end
