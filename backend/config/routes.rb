Rails.application.routes.draw do
  post '/login', to: 'api/v1/auth#login'
  post '/send_signup_otp', to: 'api/v1/auth#send_signup_otp'
  post '/complete_signup', to: 'api/v1/auth#complete_signup'

  resources :bookings, only: [:index, :create, :show, :update] do
    member do
      post :cancel_order
      post :request_return
    end
  end
  resources :doctors, only: [:index, :show, :create, :destroy]
end
