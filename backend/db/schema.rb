# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_10_07_000000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "bookings", force: :cascade do |t|
    t.string "amount"
    t.datetime "appointment_at"
    t.string "booking_type"
    t.string "cancellation_fee"
    t.string "consultation_type"
    t.datetime "created_at", null: false
    t.string "customer_name"
    t.string "delivery_address"
    t.string "deposit"
    t.bigint "doctor_id"
    t.string "doctor_time_slot"
    t.integer "duration_days"
    t.string "ip_address"
    t.string "item"
    t.text "patient_problem"
    t.datetime "payment_expires_at"
    t.string "payment_mode"
    t.string "phone"
    t.string "refund_amount"
    t.string "status"
    t.datetime "updated_at", null: false
    t.string "video_room"
    t.index ["doctor_id", "appointment_at"], name: "index_bookings_on_active_doctor_appointment", unique: true, where: "((doctor_id IS NOT NULL) AND (appointment_at IS NOT NULL) AND ((status)::text <> ALL ((ARRAY['Cancelled'::character varying, 'Expired'::character varying, 'Completed'::character varying])::text[])))"
    t.index ["doctor_id"], name: "index_bookings_on_doctor_id"
  end

  create_table "crm_notes", force: :cascade do |t|
    t.string "admin_name"
    t.datetime "created_at", null: false
    t.text "note"
    t.string "phone"
    t.datetime "updated_at", null: false
  end

  create_table "doctors", force: :cascade do |t|
    t.boolean "available"
    t.datetime "created_at", null: false
    t.string "experience"
    t.string "fee"
    t.string "image_url"
    t.string "name"
    t.string "phone"
    t.string "qualification"
    t.string "reg_number"
    t.string "specialty"
    t.string "timing"
    t.datetime "updated_at", null: false
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email"
    t.string "name"
    t.string "otp_code"
    t.datetime "otp_sent_at"
    t.string "password_digest"
    t.string "phone"
    t.string "role"
    t.datetime "updated_at", null: false
  end

  add_foreign_key "bookings", "doctors"
end
