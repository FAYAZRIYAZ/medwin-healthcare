Rails.application.routes.draw do
  post '/login', to: 'api/v1/auth#login'
  post '/login_with_otp', to: 'api/v1/auth#login_with_otp'
  post '/send_signup_otp', to: 'api/v1/auth#send_signup_otp'
  post '/complete_signup', to: 'api/v1/auth#complete_signup'
  post '/send_password_reset_otp', to: 'api/v1/auth#send_password_reset_otp'
  post '/reset_password', to: 'api/v1/auth#reset_password'

  resources :bookings, only: [:index, :create, :show, :update] do
    member do
      post :cancel_order
      post :request_return
    end
    post '/admin/reset_patient_data', to: 'admin#reset_patient_data'
  end
  resources :doctors, only: [:index, :show, :create, :destroy]
end
