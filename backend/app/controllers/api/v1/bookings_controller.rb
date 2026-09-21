class Api::V1::BookingsController < ApplicationController
  # GET /api/v1/bookings
  def index
    scope = Booking.order(created_at: :desc)
    scope = scope.where(phone: params[:phone]) if params[:phone].present?

    today = Date.current

    bookings = scope.map do |b|
      booking_date = b.created_at ? b.created_at.to_date : today
      days_held = (today - booking_date).to_i
      days_held = 1 if days_held <= 0

      daily_rate = b.amount.to_s.gsub(/\D/, "").to_i
      daily_rate = 350 if daily_rate.zero?
      accrued_rent = daily_rate * days_held

      is_active_unreturned = (b.status == "Delivered" || b.status == "Return Requested") && b.booking_type == "cylinder"

      {
        id: "BK-#{1000 + b.id}",
        raw_id: b.id,
        type: b.booking_type || "cylinder",
        customerName: b.customer_name || "Anonymous",
        phone: b.phone || "N/A",
        item: b.item || "Medical Oxygen",
        bookingDate: b.created_at ? b.created_at.strftime("%b %d, %Y - %I:%M %p") : "Just now",
        raw_date: b.created_at ? b.created_at.strftime("%Y-%m-%d") : today.strftime("%Y-%m-%d"),
        status: b.status || "Pending",
        amount: b.amount || "₹350",
        deposit: b.deposit || "N/A",
        deliveryAddress: b.delivery_address.presence || "Online / Pick-up",
        paymentMode: b.payment_mode || "COD",
        durationDays: b.duration_days || 1,
        doctorTimeSlot: b.doctor_time_slot,
        cancellationFee: b.cancellation_fee,
        refundAmount: b.refund_amount,
        isActiveUnreturned: is_active_unreturned,
        daysHeld: days_held,
        accruedRent: "₹#{accrued_rent}"
      }
    end

    render json: bookings, status: :ok
  rescue StandardError => e
    render json: { error: e.message }, status: :internal_server_error
  end

  # POST /api/v1/bookings
  def create
    data = parsed_body
    booking = Booking.new(
      booking_type: data[:booking_type],
      customer_name: data[:customer_name],
      phone: data[:phone],
      item: data[:item],
      delivery_address: data[:delivery_address],
      payment_mode: data[:payment_mode],
      amount: data[:amount],
      deposit: data[:deposit],
      duration_days: data[:duration_days] || 1,
      doctor_time_slot: data[:doctor_time_slot],
      ip_address: request.remote_ip,
      status: "Pending"
    )

    if booking.save
      render json: { message: "Booking confirmed successfully", booking: booking }, status: :created
    else
      render json: { error: booking.errors.full_messages.join(", ") }, status: :unprocessable_entity
    end
  end

  # POST /api/v1/bookings/:id/update_status
  def update_status
    raw_num = params[:id].to_s.gsub(/\D/, "").to_i
    actual_id = raw_num > 1000 ? (raw_num - 1000) : raw_num

    booking = Booking.find_by(id: actual_id)
    return render json: { error: "Booking not found" }, status: :not_found unless booking

    new_status = params[:status] || "Pending"
    booking.update(status: new_status)

    render json: { message: "Status updated to #{new_status}", booking: booking }, status: :ok
  end

  # POST /api/v1/bookings/:id/confirm_return
  def confirm_return
    raw_num = params[:id].to_s.gsub(/\D/, "").to_i
    actual_id = raw_num > 1000 ? (raw_num - 1000) : raw_num

    booking = Booking.find_by(id: actual_id)
    return render json: { error: "Booking not found" }, status: :not_found unless booking

    booking.update(
      status: "Completed",
      deposit: "#{booking.deposit.to_s.gsub(/\(.*\)/, '').strip} (Refunded)"
    )

    render json: { message: "Cylinder returned and deposit refunded", booking: booking }, status: :ok
  end

  # POST /api/v1/bookings/:id/cancel_order
  def cancel_order
    raw_num = params[:id].to_s.gsub(/\D/, "").to_i
    actual_id = raw_num > 1000 ? (raw_num - 1000) : raw_num

    booking = Booking.find_by(id: actual_id)
    return render json: { error: "Booking not found" }, status: :not_found unless booking

    base_val = booking.amount.to_s.gsub(/\D/, "").to_i
    cancellation_charge = (base_val * 0.30).round
    refund_val = base_val - cancellation_charge

    booking.update(
      status: "Cancelled",
      cancellation_fee: "₹#{cancellation_charge} (30%)",
      refund_amount: "₹#{refund_val} (70%)"
    )

    render json: {
      message: "Order cancelled with 30% retention fee",
      cancellation_fee: "₹#{cancellation_charge}",
      refund_amount: "₹#{refund_val}"
    }, status: :ok
  end

  # POST /api/v1/bookings/:id/request_return
  def request_return
    raw_num = params[:id].to_s.gsub(/\D/, "").to_i
    actual_id = raw_num > 1000 ? (raw_num - 1000) : raw_num

    booking = Booking.find_by(id: actual_id)
    return render json: { error: "Booking not found" }, status: :not_found unless booking

    booking.update(status: "Return Requested")
    render json: { message: "Return pickup requested", booking: booking }, status: :ok
  end

  # POST /api/v1/bookings/:id/refill
  def refill
    raw_num = params[:id].to_s.gsub(/\D/, "").to_i
    actual_id = raw_num > 1000 ? (raw_num - 1000) : raw_num

    booking = Booking.find_by(id: actual_id)
    return render json: { error: "Booking not found" }, status: :not_found unless booking

    refill_booking = Booking.create(
      booking_type: "cylinder",
      customer_name: booking.customer_name,
      phone: booking.phone,
      item: "Refill Swap for #{booking.item}",
      delivery_address: booking.delivery_address,
      amount: "₹250",
      deposit: "₹0 (Swap)",
      payment_mode: "COD",
      status: "Pending"
    )

    render json: { message: "Refill order created", booking: refill_booking }, status: :created
  end

  # GET /api/v1/bookings/daily_report
  def daily_report
    today = Date.current
    todays_bookings = Booking.where("created_at >= ?", today.beginning_of_day)
    active_unreturned = Booking.where(status: ["Delivered", "Return Requested"], booking_type: "cylinder")

    total_orders = todays_bookings.count
    cylinders_rented = todays_bookings.where(booking_type: "cylinder").where.not(status: "Cancelled").count
    refills_count = todays_bookings.where("item ILIKE ?", "%refill%").count
    doctor_appointments = todays_bookings.where(booking_type: "doctor").count
    homecare_requests = todays_bookings.where(booking_type: "homecare").count
    total_homecare_days = todays_bookings.where(booking_type: "homecare").sum(:duration_days)

    total_revenue = todays_bookings.where.not(status: "Cancelled").sum do |b|
      b.amount.to_s.gsub(/\D/, "").to_i
    end

    total_cancellation_penalty = todays_bookings.where(status: "Cancelled").sum do |b|
      b.cancellation_fee.to_s.gsub(/\D/, "").to_i
    end

    render json: {
      date: today.strftime("%B %d, %Y"),
      totalOrdersToday: total_orders,
      cylindersRented: cylinders_rented,
      refillSwaps: refills_count,
      doctorAppointments: doctor_appointments,
      homecareBookings: homecare_requests,
      totalHomecareDaysCommitted: total_homecare_days,
      todaysGrossRevenue: "₹#{total_revenue + total_cancellation_penalty}",
      cancellationPenaltiesCollected: "₹#{total_cancellation_penalty}",
      unreturnedCylindersCount: active_unreturned.count
    }, status: :ok
  end

  private

  def parsed_body
    JSON.parse(request.body.read).with_indifferent_access
  rescue StandardError
    params
  end
end