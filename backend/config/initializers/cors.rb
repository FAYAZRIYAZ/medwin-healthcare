Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*(
      ENV.fetch(
        "FRONTEND_ORIGINS",
        "https://fayazriyaz.github.io,http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"
      ).split(",").map { |origin| origin.strip.chomp("/") }
    ))
    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head]
  end
end
