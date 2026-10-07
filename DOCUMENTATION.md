# MEDWIN Technical Documentation

## 1. Architecture

MEDWIN uses a browser-based React application backed by a Rails JSON API.

```text
Browser / installed PWA
          |
          | HTTP JSON API
          v
Ruby on Rails backend
          |
          v
      PostgreSQL
```

The frontend is responsive and can be installed as a PWA on supported browsers. The same frontend can later be packaged for Android and iOS with Capacitor.

## 2. Local Development

Start the API first:

```bash
cd backend
bundle install
bin/rails db:prepare
bin/rails db:seed
bin/rails server -p 3003
```

Start the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

The application is available at `http://localhost:5173` and the API at `http://localhost:3003`.

For hosting, set `VITE_API_URL` in the frontend service. The backend uses `DATABASE_URL` for managed PostgreSQL and `FRONTEND_ORIGINS` for CORS. See `render.yaml`, `frontend/.env.example`, and `backend/.env.example` for deployment templates.

## 3. Authentication

### Admin login

`POST /login` accepts an identifier and password. The frontend sends `is_admin: true` for admin login, and the backend requires the matching user to have the `admin` role.

### Patient signup

1. The patient enters a name and email address or phone number.
2. The frontend calls `POST /send_signup_otp`.
3. The backend creates or updates a pending patient record and stores a six-digit OTP.
4. The patient submits the OTP and a password to `POST /complete_signup`.
5. The backend checks the OTP, password confirmation, and expiry before returning a JWT.

For non-production testing only, `OTP_DEBUG=true` returns the OTP as `debug_otp`; never enable it on a public service. Real phone signup requires `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID` and an approved MSG91 OTP template. The signup screen does not provide a fallback or sample OTP if delivery is unavailable.

Completed patient accounts cannot sign up again with the same phone number. Patients who forget their password can select **Forgot password?** on the login screen, receive a new SMS OTP through MSG91, and set a new password after verification.

## 4. Main API Routes

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/login` | Authenticate admin or patient |
| POST | `/send_signup_otp` | Start verified patient signup |
| POST | `/complete_signup` | Verify OTP and create patient account |
| GET | `/bookings` | List the authenticated patient's own bookings, or all bookings for an admin |
| POST | `/bookings` | Create a booking for the authenticated account |
| GET | `/bookings/:id` | Read an owned booking, or any booking for an admin |
| PUT/PATCH | `/bookings/:id` | Update an owned pending booking, or manage any booking as an admin |
| GET | `/bookings/doctor_slots` | Read available doctor appointment times |
| GET | `/doctors` | List the shared doctor roster |
| POST | `/doctors` | Create a doctor profile (admin JWT required) |
| DELETE | `/doctors/:id` | Remove a doctor profile (admin JWT required) |

Protected booking and admin requests require `Authorization: Bearer <JWT>`. Patient booking queries are scoped to the authenticated account; a caller-supplied phone number does not grant access to another patient's records.

## 5. Frontend Areas

- `src/App.jsx`: routing and session state
- `src/pages/Login.jsx`: patient/admin login and OTP signup
- `src/pages/PatientPortal.jsx`: patient services and booking flows
- `src/pages/Dashboard.jsx`: admin bookings, doctors, CRM, and reports
- `src/api/client.js`: Axios API base URL
- `src/index.css`: responsive behavior
- `public/manifest.webmanifest`: installable app metadata
- `public/sw.js`: app-shell service worker

## 6. Responsive and PWA Behavior

- Desktop uses the full admin header and patient sidebar.
- Tablet layouts reduce padding and allow navigation to scroll horizontally.
- Mobile patient navigation becomes a sticky horizontal navigation bar.
- Tables remain usable with horizontal scrolling rather than breaking the viewport.
- The service worker caches the application shell and does not cache booking or doctor API responses, preventing stale operational data.

## 7. Payments

Payment screens submit a JSON booking payload with a UPI/UTR reference. The backend stores the payment mode and leaves the booking in `Pending` status for admin verification.

The current implementation is a manual UPI confirmation workflow. It is not a payment gateway settlement integration. Before production use, add server-side payment verification and never trust a client-provided approval status.

## 8. Reports and WhatsApp

The admin Reports tab supports today, yesterday, and arbitrary historical dates. It filters bookings by creation date, calculates approved revenue, displays daily booking rows, and creates a WhatsApp link containing the selected report.

The WhatsApp action opens a prefilled message. It does not send messages automatically and does not require WhatsApp API credentials.

## 9. Production Checklist

- Set a production `API` base URL.
- Configure PostgreSQL and run migrations.
- Provide Rails `secret_key_base` securely.
- Keep `backend/config/master.key` private.
- Configure real email/SMS OTP delivery.
- Disable `OTP_DEBUG` and remove development OTP responses and logs.
- Replace development admin passwords.
- Configure HTTPS and restrictive CORS origins.
- Keep server-side JWT authorization enabled for patient booking access and admin-only actions.
- Configure real payment verification.
- Build the frontend with `npm run build` and serve the `dist` directory.

## 10. Troubleshooting

### White screen

Make sure only one Vite process is serving the frontend port. Restart it from the frontend directory:

```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

### API connection errors

Confirm Rails is running on port `3003` and check:

```bash
curl -H "Authorization: Bearer <JWT>" http://localhost:3003/bookings
```

### Signup OTP errors

In development, inspect the response `debug_otp` or `backend/log/development.log`. In production, verify the configured email/SMS provider and never rely on development OTP output.