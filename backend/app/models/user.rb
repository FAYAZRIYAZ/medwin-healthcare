class User < ApplicationRecord
  has_secure_password

  validates :name, presence: true
  
  # Admin must have email; patients must have either phone or email
  validates :email, uniqueness: { case_sensitive: false }, allow_blank: true
  validates :phone, uniqueness: true, allow_blank: true

  validate :identifier_presence
  validate :admin_must_have_email

  # 8+ chars, letter, number, and special character
  PASSWORD_FORMAT = /\A(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{8,}\z/

  validates :password,
            presence: true,
            format: {
              with: PASSWORD_FORMAT,
              message: "must be at least 8 characters long and include a letter, a number, and a symbol (e.g. @#$!)"
            },
            if: -> { new_record? || password.present? }

  def generate_otp!
    code = sprintf("%06d", rand(100_000..999_999))
    update_columns(otp_code: code, otp_sent_at: Time.current)
    code
  end

  def valid_otp?(code)
    return false if otp_code.blank? || otp_sent_at.blank?
    return false if otp_sent_at < 10.minutes.ago

    otp_code.to_s.strip == code.to_s.strip
  end

  def clear_otp!
    update_columns(otp_code: nil, otp_sent_at: nil)
  end

  private

  def identifier_presence
    if email.blank? && phone.blank?
      errors.add(:base, "Either phone number or email is required")
    end
  end

  def admin_must_have_email
    if role == "admin" && email.blank?
      errors.add(:email, "is mandatory for admin accounts")
    end
  end
end