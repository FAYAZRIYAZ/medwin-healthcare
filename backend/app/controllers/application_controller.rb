class ApplicationController < ActionController::API
  SECRET_KEY = Rails.application.secret_key_base

  rescue_from ActionDispatch::Http::Parameters::ParseError do |_exception|
    render json: { error: "Invalid JSON format in request body" }, status: :bad_request
  end

  def parsed_body
    @parsed_body ||= begin
      raw = request.raw_post
      if raw.present?
        JSON.parse(raw).with_indifferent_access
      else
        params.to_unsafe_h.with_indifferent_access
      end
    rescue JSON::ParserError
      params.to_unsafe_h.with_indifferent_access
    end
  end

  def current_user
    return @current_user if instance_variable_defined?(:@current_user)

    token = request.headers["Authorization"].to_s.match(/\ABearer\s+(.+)\z/i)&.captures&.first
    return @current_user = nil if token.blank?

    payload = JWT.decode(token, SECRET_KEY, true, algorithm: "HS256").first
    @current_user = User.find_by(id: payload["user_id"])
  rescue JWT::DecodeError
    @current_user = nil
  end

  def require_user!
    return true if current_user

    render json: { error: "Authentication required." }, status: :unauthorized
    false
  end

  def require_admin!
    return true if current_user&.role == "admin"
    return render json: { error: "Authentication required." }, status: :unauthorized unless current_user

    render json: { error: "Admin access required." }, status: :forbidden
    false
  end

  def admin_user?
    current_user&.role == "admin"
  end

  def authorized_booking_scope
    scope = Booking.all
    scope = scope.where(phone: current_user.phone) unless admin_user?
    scope
  end
end
