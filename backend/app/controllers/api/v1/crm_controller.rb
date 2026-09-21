class Api::V1::CrmController < ApplicationController
  # GET /api/v1/crm/patients
  def patients
    # Aggregate patient profiles based on phone numbers from bookings
    bookings = Booking.order(created_at: :desc)
    
    grouped = bookings.group_by(&:phone)
    notes_by_phone = CrmNote.order(created_at: :desc).group_by(&:phone)

    patient_records = grouped.map do |phone, b_list|
      latest_booking = b_list.first
      
      # Calculate active items currently in their home
      active_rentals = b_list.select { |b| b.status == "Delivered" && b.booking_type == "cylinder" }
      
      # Calculate approximate lifetime spend
      total_spend = b_list.sum do |b|
        raw_num = b.amount.to_s.gsub(/\D/, "").to_i
        raw_num.positive? ? raw_num : 0
      end

      {
        phone: phone,
        name: latest_booking.customer_name || "Patient",
        last_address: latest_booking.delivery_address,
        total_bookings: b_list.count,
        lifetime_spend: "₹#{total_spend}",
        active_equipment_count: active_rentals.count,
        active_equipment_names: active_rentals.map(&:item),
        last_activity: latest_booking.created_at ? latest_booking.created_at.strftime("%b %d, %Y") : "Recent",
        notes: (notes_by_phone[phone] || []).map { |n| { id: n.id, text: n.note, admin: n.admin_name, date: n.created_at.strftime("%b %d, %I:%M %p") } }
      }
    end

    render json: patient_records, status: :ok
  rescue StandardError => e
    render json: { error: e.message }, status: :internal_server_error
  end

  # POST /api/v1/crm/notes
  def add_note
    data = parsed_body
    note = CrmNote.new(
      phone: data[:phone],
      note: data[:note],
      admin_name: data[:admin_name].presence || "Admin"
    )

    if note.save
      render json: { message: "CRM interaction log saved", note: note }, status: :created
    else
      render json: { error: note.errors.full_messages.join(", ") }, status: :unprocessable_entity
    end
  end
end