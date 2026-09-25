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

    def require_admin!
      token = request.headers["Authorization"].to_s.delete_prefix("Bearer ").strip
      payload = JWT.decode(token, SECRET_KEY, true, algorithm: "HS256").first
      user = User.find_by(id: payload["user_id"])
      return true if user&.role == "admin"

      render json: { error: "Admin access required." }, status: :forbidden
      false
    rescue JWT::DecodeError, ActiveRecord::RecordNotFound
      render json: { error: "Authentication required." }, status: :unauthorized
      false
    end
  end
end
