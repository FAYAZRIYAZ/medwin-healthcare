# backend/db/seeds.rb

primary_admin = User.find_or_initialize_by(email: "admin@medwin.com")
primary_admin.name = "Medwin Operations Admin"
primary_admin.phone = "9502832031"
primary_admin.role = "admin"
primary_admin.password = "Medwin@2026"
primary_admin.save!

dispatch_admin = User.find_or_initialize_by(email: "dispatch@medwin.com")
dispatch_admin.name = "Medwin Dispatch Lead"
dispatch_admin.phone = nil
dispatch_admin.role = "admin"
dispatch_admin.password = "Dispatch@2026"
dispatch_admin.save!

puts "2 Admins created: admin@medwin.com & dispatch@medwin.com"

demo_doctors = [
  {
    name: "Dr. Ananya Rao",
    specialty: "General Physician",
    qualification: "MBBS, MD (Internal Medicine)",
    fee: "800",
    phone: "9000000001",
    timing: "10:00 AM - 02:00 PM",
    reg_number: "TSMC/2026/001",
    experience: "12 years"
  },
  {
    name: "Dr. Vikram Shah",
    specialty: "Cardiology",
    qualification: "MBBS, DM (Cardiology)",
    fee: "1200",
    phone: "9000000002",
    timing: "02:00 PM - 06:00 PM",
    reg_number: "TSMC/2026/002",
    experience: "15 years"
  },
  {
    name: "Dr. Meera Iyer",
    specialty: "Pediatrics",
    qualification: "MBBS, DCH",
    fee: "700",
    phone: "9000000003",
    timing: "09:00 AM - 01:00 PM",
    reg_number: "TSMC/2026/003",
    experience: "9 years"
  },
  {
    name: "Dr. Arjun Reddy",
    specialty: "Orthopedics",
    qualification: "MBBS, MS (Orthopedics)",
    fee: "1000",
    phone: "9000000004",
    timing: "04:00 PM - 08:00 PM",
    reg_number: "TSMC/2026/004",
    experience: "11 years"
  }
]

demo_doctors.each do |attributes|
  doctor = Doctor.find_or_initialize_by(reg_number: attributes[:reg_number])
  doctor.assign_attributes(attributes.merge(available: true))
  doctor.save!
end

puts "#{demo_doctors.length} demo doctors created or updated"
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
