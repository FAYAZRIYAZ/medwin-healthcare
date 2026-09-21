# In backend/app/controllers/api/v1/doctors_controller.rb
class Api::V1::DoctorsController < ApplicationController
  def index
    doctors = Doctor.order(created_at: :desc).map do |d|
      {
        id: d.id,
        name: d.name,
        specialty: d.specialty,
        fee: d.fee,
        timing: d.timing,
        phone: d.phone,
        qualification: d.qualification,
        experience: d.experience,
        image_url: d.respond_to?(:image_url) && d.image_url.present? ? d.image_url : "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80"
      }
    end
    render json: doctors, status: :ok
  end

  def create
    data = parsed_body
    doctor = Doctor.new(
      name: data[:name],
      specialty: data[:specialty],
      fee: data[:fee],
      timing: data[:timing],
      phone: data[:phone],
      qualification: data[:qualification],
      experience: data[:experience],
      image_url: data[:image_url].presence || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80"
    )

    if doctor.save
      render json: { message: "Doctor profile saved", doctor: doctor }, status: :created
    else
      render json: { error: doctor.errors.full_messages.join(", ") }, status: :unprocessable_entity
    end
  end

  def destroy
    doctor = Doctor.find_by(id: params[:id])
    if doctor&.destroy
      render json: { message: "Doctor profile removed" }, status: :ok
    else
      render json: { error: "Doctor not found" }, status: :not_found
    end
  end
end