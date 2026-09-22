require "net/http"
require "uri"
require "json"

class Msg91OtpSender
  class DeliveryError < StandardError; end

  def self.deliver!(phone:, otp:)
    auth_key = ENV["MSG91_AUTH_KEY"].to_s.strip
    template_id = ENV["MSG91_TEMPLATE_ID"].to_s.strip

    if auth_key.blank? || template_id.blank?
      raise DeliveryError, "SMS OTP is not configured. Add MSG91_AUTH_KEY and MSG91_TEMPLATE_ID."
    end

    mobile = phone.to_s.delete(" ")
    mobile = "91#{mobile}" if mobile.match?(/\A[0-9]{10}\z/)
    mobile = mobile.delete_prefix("+")
    uri = URI(ENV.fetch("MSG91_OTP_ENDPOINT", "https://control.msg91.com/api/v5/otp"))
    request = Net::HTTP::Post.new(uri)
    request["authkey"] = auth_key
    request["accept"] = "application/json"
    request["content-type"] = "application/json"
    request.body = {
      template_id: template_id,
      mobile: mobile,
      otp: otp,
      otp_expiry: 10
    }.to_json

    response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", read_timeout: 10) do |http|
      http.request(request)
    end

    unless response.is_a?(Net::HTTPSuccess)
      raise DeliveryError, "SMS provider rejected the OTP request (HTTP #{response.code})."
    end

    body = JSON.parse(response.body)
    return if body["type"].to_s.casecmp("success").zero? || body["type"].blank?

    raise DeliveryError, "SMS provider rejected the OTP request."
  rescue JSON::ParserError
    raise DeliveryError, "SMS provider returned an invalid response."
  rescue Timeout::Error, Errno::ECONNREFUSED, SocketError
    raise DeliveryError, "SMS provider could not be reached. Please try again."
  end
end
