require "net/http"
require "uri"
require "json"

class TwoFactorOtpSender
  class DeliveryError < StandardError; end

  def self.deliver!(phone:, otp:)
    api_key = ENV["TWOFACTOR_API_KEY"].to_s.strip
    raise DeliveryError, "2Factor API key is not configured." if api_key.blank?

    mobile = phone.to_s.delete(" ").delete("+")
    mobile = "91#{mobile}" if mobile.match?(/\A[0-9]{10}\z/)
    template = ENV["TWOFACTOR_OTP_TEMPLATE"].to_s.strip
    details = template.presence || "AUTOGEN"
    uri = URI("https://2factor.in/API/V1/#{URI.encode_www_form_component(api_key)}/SMS/#{URI.encode_www_form_component(mobile)}/#{URI.encode_www_form_component(otp)}/#{URI.encode_www_form_component(details)}")

    response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, read_timeout: 10) do |http|
      http.get(uri.request_uri, { "Accept" => "application/json" })
    end

    raise DeliveryError, "2Factor rejected the OTP request (HTTP #{response.code})." unless response.is_a?(Net::HTTPSuccess)

    body = JSON.parse(response.body)
    return if body["Status"].to_s.casecmp("Success").zero?

    raise DeliveryError, "2Factor rejected the OTP request."
  rescue JSON::ParserError
    raise DeliveryError, "2Factor returned an invalid response."
  rescue Timeout::Error, Errno::ECONNREFUSED, SocketError
    raise DeliveryError, "2Factor could not be reached. Please try again."
  end
end
