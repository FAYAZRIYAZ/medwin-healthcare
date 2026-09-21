class ApplicationController < ActionController::API
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
end
