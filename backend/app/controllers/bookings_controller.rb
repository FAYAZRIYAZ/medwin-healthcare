class BookingsController < ApplicationController
  skip_before_action :verify_authenticity_token, raise: false
  before_action :require_user!, except: :doctor_slots

  def index
    @bookings = authorized_booking_scope.order(created_at: :desc)
    render json: @bookings.map { |b| format_booking(b) }
  end

  def show
    booking = authorized_booking_scope.find_by(id: params[:id])
    return render json: { error: "Booking not found" }, status: :not_found unless booking

    render json: format_booking(booking)
  end

  def doctor_slots
    doctor = Doctor.find_by(id: params[:doctor_id])
    return render json: { error: "Doctor not found" }, status: :not_found unless doctor

    date = Date.iso8601(params.require(:date))
    return render json: { error: "Choose a date within the next 14 days" }, status: :unprocessable_entity unless date.between?(Date.current, 14.days.from_now.to_date)

    expire_payment_holds(doctor.id)
    day_start = date.in_time_zone.beginning_of_day
    busy_times = Booking.where(doctor_id: doctor.id, appointment_at: day_start...day_start.end_of_day)
      .where.not(status: %w[Cancelled Expired Completed])
      .pluck(:appointment_at)
      .map { |time| time.in_time_zone.strftime("%H:%M") }

    slots = (9 * 60..18 * 60 + 30).step(30).filter_map do |minutes|
      hour, minute = minutes.divmod(60)
      start_at = date.in_time_zone.change(hour: hour, min: minute)
      next if start_at <= Time.current || busy_times.include?(start_at.strftime("%H:%M"))

      { starts_at: start_at.iso8601, label: start_at.strftime("%I:%M %p") }
    end

    render json: { slots: slots }, status: :ok
  rescue Date::Error, ActionController::ParameterMissing
    render json: { error: "Choose a valid appointment date" }, status: :unprocessable_entity
  end

  def create
    @booking = Booking.new(booking_params)
    unless admin_user?
      return render json: { error: "A patient phone number is required on your account." }, status: :unprocessable_entity if current_user.phone.blank?

      @booking.phone = current_user.phone
      @booking.customer_name = current_user.name
      @booking.status = "Pending"
      if @booking.doctor_id.present? && @booking.payment_mode == "Awaiting online payment"
        @booking.payment_expires_at = 15.minutes.from_now
      end
    end
    @booking.status ||= "Pending"
    expire_payment_holds(@booking.doctor_id) if @booking.doctor_id.present?
    if @booking.save
      render json: format_booking(@booking), status: :created
    else
      render json: { error: @booking.errors.full_messages }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotUnique
    render json: { error: "That appointment time has just been booked. Please choose another available time." }, status: :conflict
  end

  def update
    clean_id = params[:id].to_s.gsub(/\D/, '')
    @booking = authorized_booking_scope.find_by(id: clean_id) || authorized_booking_scope.find_by(id: params[:id])

    if @booking.nil?
      render json: { error: "Booking not found" }, status: :not_found
      return
    end

    unless admin_user?
      return render json: { error: "Only pending bookings can be updated." }, status: :conflict unless @booking.status == "Pending"

      update_params = booking_params.slice(:payment_mode)
      requested_status = params[:status] || params.dig(:booking, :status)
      if requested_status.present?
        unless %w[Pending Cancelled].include?(requested_status)
          return render json: { error: "Patients cannot change the booking approval status." }, status: :forbidden
        end
        update_params[:status] = requested_status
      end
      return update_booking(update_params)
    end

    expire_payment_holds(@booking.doctor_id) if @booking.doctor_id.present?
    @booking.reload
    if @booking.status == "Expired" && params[:status] != "Cancelled"
      render json: { error: "This payment reservation expired. Please select a new appointment time." }, status: :conflict
      return
    end

    # Read status directly from query params or request parameters
    new_status = params[:status] || params.dig(:booking, :status)

    update_params = booking_params
    update_params[:status] = new_status if new_status.present?

    if @booking.update(update_params)
      render json: format_booking(@booking), status: :ok
    else
      render json: { error: @booking.errors.full_messages.presence || "Invalid status provided" }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotUnique
    render json: { error: "That appointment time has just been booked. Please choose another available time." }, status: :conflict
  end

  private

  def update_booking(update_params)
    if @booking.update(update_params)
      render json: format_booking(@booking), status: :ok
    else
      render json: { error: @booking.errors.full_messages.presence || "Invalid booking update" }, status: :unprocessable_entity
    end
  end

  def expire_payment_holds(doctor_id)
    Booking.where(doctor_id: doctor_id, status: "Pending")
      .where("payment_expires_at IS NOT NULL AND payment_expires_at <= ?", Time.current)
      .update_all(status: "Expired", updated_at: Time.current)
  end

  def booking_params
    params.permit(
      :booking_type, :customer_name, :phone, :item, :delivery_address,
      :amount, :deposit, :duration_days, :payment_mode, :status, :doctor_time_slot,
      :doctor_id, :appointment_at, :consultation_type, :patient_problem,
      :payment_expires_at,
      booking: [:booking_type, :customer_name, :phone, :item, :delivery_address, :amount, :deposit, :duration_days, :payment_mode, :status, :doctor_time_slot, :doctor_id, :appointment_at, :consultation_type, :patient_problem, :payment_expires_at]
    ).except(:booking)
  end

  def format_booking(b)
    {
      id: "BK-#{b.id}",
      raw_id: b.id,
      booking_type: b.booking_type || 'order',
      type: b.booking_type || 'order',
      customer_name: b.customer_name,
      phone: b.phone,
      item: b.item,
      delivery_address: b.delivery_address,
      deliveryAddress: b.delivery_address,
      amount: b.amount,
      deposit: b.deposit,
      payment_mode: b.payment_mode || 'Cash on Delivery',
      status: b.status || 'Pending',
      created_at: b.created_at,
      doctor_id: b.doctor_id,
      appointment_at: b.appointment_at,
      consultation_type: b.consultation_type,
      patient_problem: b.patient_problem,
      video_room: b.video_room,
      payment_expires_at: b.payment_expires_at
    }
  end
end
