class Api::V1::AuthController < ApplicationController
  SECRET_KEY = Rails.application.secret_key_base

  # POST /api/v1/send_signup_otp
  def send_signup_otp
    data  = parsed_body
    identifier = (data[:identifier] || params[:identifier])&.to_s&.strip
    name  = (data[:name]  || params[:name])&.to_s&.strip

    if identifier.blank? || name.blank?
      return render json: { error: "Name and email or phone number are required." }, status: :bad_request
    end

    email = identifier.include?("@") ? identifier.downcase : nil
    phone = email ? nil : identifier.gsub(/\s+/, "")
    unless email || phone.match?(/\A\+?[0-9]{10,15}\z/)
      return render json: { error: "Enter a valid email address or phone number." }, status: :bad_request
    end

    existing_user = email ? User.find_by("LOWER(email) = ?", email) : User.find_by(phone: phone)

    user = existing_user || User.new(email: email, phone: phone, role: "patient")
    user.name = name
    user.email = email if email.present?
    user.phone = phone if phone.present?
    user.password = "TempPass123!" if user.password_digest.blank?
    user.save!(validate: false)

    otp = user.generate_otp!

    # In production, configure MSG91 for delivery. OTP_DEBUG keeps signup
    # testable when the SMS provider is intentionally not configured.
    if phone && sms_otp_configured?
      Msg91OtpSender.deliver!(phone: phone, otp: otp)
    elsif !ActiveModel::Type::Boolean.new.cast(ENV["OTP_DEBUG"])
      return render json: { error: "Email OTP delivery is not configured. Use a phone number for signup." }, status: :unprocessable_entity
    end

    # POST /login_with_otp
    def login_with_otp
      data = parsed_body
      identifier = (data[:identifier] || params[:identifier]).to_s.strip
      otp = (data[:otp] || params[:otp]).to_s.strip
      clean_phone = identifier.gsub(/\s+/, "")
      user = User.find_by("LOWER(email) = ? OR phone = ?", identifier.downcase, clean_phone)

      return render json: { error: "Patient account not found. Request a new OTP to continue." }, status: :not_found unless user
      return render json: { error: "Invalid or expired OTP code." }, status: :unauthorized unless user.valid_otp?(otp)

      user.clear_otp!
      user.save!(validate: false)
      token = JWT.encode({ user_id: user.id, exp: 7.days.from_now.to_i }, SECRET_KEY)

      render json: {
        token: token,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }
      }, status: :ok
    rescue StandardError => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    render json: {
      message: "Verification OTP sent to #{identifier}.",
      debug_otp: (otp if ActiveModel::Type::Boolean.new.cast(ENV["OTP_DEBUG"]))
    }, status: :ok
  rescue StandardError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  # POST /api/v1/complete_signup
  def complete_signup
    data  = parsed_body
    identifier = (data[:identifier] || params[:identifier])&.to_s&.strip
    otp   = (data[:otp]   || params[:otp])&.to_s&.strip
    password = (data[:password] || params[:password])&.to_s
    password_confirmation = (data[:password_confirmation] || params[:password_confirmation])&.to_s

    email = identifier.to_s.include?("@") ? identifier.downcase : nil
    phone = email ? nil : identifier.to_s.gsub(/\s+/, "")
    user = email ? User.find_by("LOWER(email) = ?", email) : User.find_by(phone: phone)

    if user.nil?
      return render json: { error: "Session expired. Please request OTP again." }, status: :not_found
    end

    unless user.valid_otp?(otp)
      return render json: { error: "Invalid or expired OTP code." }, status: :unauthorized
    end

    if password != password_confirmation
      return render json: { error: "Passwords do not match." }, status: :unprocessable_entity
    end

    user.password = password
    user.password_confirmation = password_confirmation
    user.clear_otp!
    user.save!(validate: false)

    token = JWT.encode({ user_id: user.id, exp: 7.days.from_now.to_i }, SECRET_KEY)

    render json: {
      token: token,
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role }
    }, status: :created
  rescue StandardError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  # POST /send_password_reset_otp
  def send_password_reset_otp
    identifier = parsed_body[:identifier].to_s.strip
    phone = identifier.gsub(/\s+/, "")
    unless phone.match?(/\A\+?[0-9]{10,15}\z/)
      return render json: { error: "Enter the mobile number used for signup." }, status: :bad_request
    end

    user = User.find_by(phone: phone)
    return render json: { error: "No account was found for this mobile number." }, status: :not_found unless user

    otp = user.generate_otp!
    if sms_otp_configured?
      Msg91OtpSender.deliver!(phone: phone, otp: otp)
    elsif !ActiveModel::Type::Boolean.new.cast(ENV["OTP_DEBUG"])
      raise Msg91OtpSender::DeliveryError, "SMS OTP is not configured. Add MSG91_AUTH_KEY and MSG91_TEMPLATE_ID."
    end

    render json: {
      message: "Password reset OTP sent to #{identifier}.",
      debug_otp: (otp if ActiveModel::Type::Boolean.new.cast(ENV["OTP_DEBUG"]))
    }, status: :ok
  rescue StandardError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  # POST /reset_password
  def reset_password
    data = parsed_body
    phone = data[:identifier].to_s.strip.gsub(/\s+/, "")
    otp = data[:otp].to_s.strip
    password = data[:password].to_s
    password_confirmation = data[:password_confirmation].to_s
    user = User.find_by(phone: phone)

    return render json: { error: "No account was found for this mobile number." }, status: :not_found unless user
    return render json: { error: "Invalid or expired OTP code." }, status: :unauthorized unless user.valid_otp?(otp)
    return render json: { error: "Passwords do not match." }, status: :unprocessable_entity unless password == password_confirmation

    user.password = password
    user.password_confirmation = password_confirmation
    user.clear_otp!
    user.save!

    render json: { message: "Password reset successfully. You can now sign in." }, status: :ok
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: e.record.errors.full_messages.join(", ") }, status: :unprocessable_entity
  rescue StandardError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def sms_otp_configured?
    ENV["MSG91_AUTH_KEY"].present? && ENV["MSG91_TEMPLATE_ID"].present?
  end

  # POST /api/v1/login
  def login
    data       = parsed_body
    identifier = (data[:identifier] || params[:identifier])&.to_s&.strip
    password   = (data[:password]   || params[:password])&.to_s

    if identifier.blank? || password.blank?
      return render json: { error: "Identifier and password are required." }, status: :bad_request
    end

    # Look up by email OR clean phone number
    clean_phone = identifier.gsub(/\s+/, "")
    user = User.find_by("LOWER(email) = ? OR phone = ?", identifier.downcase, clean_phone)

    if data[:is_admin].to_s == "true" && user&.role != "admin"
      return render json: { error: "Admin account not found." }, status: :unauthorized
    end

    if user && user.authenticate(password)
      token = JWT.encode({ user_id: user.id, exp: 7.days.from_now.to_i }, SECRET_KEY)
      render json: {
        token: token,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }
      }, status: :ok
    else
      render json: { error: "Invalid email/phone or password." }, status: :unauthorized
    end
  rescue StandardError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end
end
