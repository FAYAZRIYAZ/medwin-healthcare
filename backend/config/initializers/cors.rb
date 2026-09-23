Rails.application.config.middleware.insert_before 0, Rack::Cors do
  # Keep local development and deployed web clients usable during API rollouts.
  allow do
    configured_origins = ENV.fetch("FRONTEND_ORIGINS", "").split(",")
    default_origins = %w[
      https://fayazriyaz.github.io
      https://medwin-healthcare.netlify.app
      capacitor://localhost
      http://localhost
      http://localhost:5173
      http://localhost:5174
      http://127.0.0.1:5173
      http://127.0.0.1:5174
    ]
    origins(*(
      (default_origins + configured_origins).map { |origin| origin.strip.sub(%r{\A(https?://[^/]+).*\z}, '\1') }.reject(&:empty?).uniq
    ))
    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head]
  end
end