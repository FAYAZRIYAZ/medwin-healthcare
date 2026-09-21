# backend/db/seeds.rb

# 1. Primary Operations Admin
primary_admin = User.find_or_initialize_by(email: "admin@medwin.com")
primary_admin.name = "Medwin Operations Admin"
primary_admin.phone = "9502832031"
primary_admin.role = "admin"
primary_admin.password = "Medwin@2026"
primary_admin.save!

# 2. Executive / Dispatch Admin
dispatch_admin = User.find_or_initialize_by(email: "dispatch@medwin.com")
dispatch_admin.name = "Medwin Dispatch Lead"
dispatch_admin.phone = nil
dispatch_admin.role = "admin"
dispatch_admin.password = "Dispatch@2026"
dispatch_admin.save!

puts "✓ 2 Admins created: admin@medwin.com & dispatch@medwin.com"