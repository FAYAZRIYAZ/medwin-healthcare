class BookingsController < ApplicationController
  skip_before_action :verify_authenticity_token, raise: false

  def index
    @bookings = params[:phone].present? ? Booking.where(phone: params[:phone]).order(created_at: :desc) : Booking.all.order(created_at: :desc)
    render json: @bookings.map { |b| format_booking(b) }
  end

  def create
    @booking = Booking.new(booking_params)
    @booking.status ||= 'Pending'
    if @booking.save
      render json: format_booking(@booking), status: :created
    else
      render json: { error: @booking.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    clean_id = params[:id].to_s.gsub(/\D/, '')
    @booking = Booking.find_by(id: clean_id) || Booking.find_by(id: params[:id])

    if @booking.nil?
      render json: { error: "Booking not found" }, status: :not_found
      return
    end

    # Read status directly from query params or request parameters
    new_status = params[:status] || params.dig(:booking, :status)

    if new_status.present? && @booking.update(status: new_status)
      render json: format_booking(@booking), status: :ok
    else
      render json: { error: @booking.errors.full_messages.presence || "Invalid status provided" }, status: :unprocessable_entity
    end
  end

  private

  def booking_params
    params.permit(
      :booking_type, :customer_name, :phone, :item, :delivery_address,
      :amount, :deposit, :duration_days, :payment_mode, :status, :doctor_time_slot,
      booking: [:booking_type, :customer_name, :phone, :item, :delivery_address, :amount, :deposit, :duration_days, :payment_mode, :status, :doctor_time_slot]
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
      created_at: b.created_at
    }
  end
end
