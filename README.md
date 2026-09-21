# MEDWIN Healthcare

MEDWIN is a healthcare service platform with a React/Vite frontend and a Ruby on Rails API. Patients can create verified accounts, browse doctors, book healthcare services, submit payments, and track bookings. Admins can manage doctors, bookings, CRM records, and daily reports.

## Features

- Patient signup with email or phone OTP verification
- Patient login and sign-out
- Admin login and protected operations dashboard
- Shared doctor roster visible to all patients
- Doctor creation and deletion from the admin portal
- Oxygen rental, home-care, diagnostics, and doctor bookings
- UPI payment reference submission
- Admin booking status updates
- Daily and historical reports with WhatsApp sharing
- Responsive layouts for mobile, tablet, and desktop
- Installable PWA support

## Project Layout

```text
backend/   Ruby on Rails API and PostgreSQL database
frontend/  React/Vite web application and PWA
```

## Quick Start

### Free hosting setup

The app is already prepared for a simple free testing stack:

- Frontend: Netlify or Cloudflare Pages (static React app)
- Frontend alternative: GitHub Pages via `.github/workflows/deploy-pages.yml`
- Backend: Render (Ruby on Rails API)
- Mobile wrapper: Capacitor Android project generated locally for app packaging

To enable GitHub Pages, open the repository's **Settings > Pages**, choose **GitHub Actions** as the source, and push to `main`. The public frontend URL will be:
`https://fayazriyaz.github.io/medwin-healthcare/`

Create the frontend build with `VITE_API_URL` pointing to the deployed backend URL, and set the backend env values in Render using the examples in `backend/.env.example` and `frontend/.env.example`.

### Backend

Requirements: Ruby, Bundler, PostgreSQL.

```bash
cd backend
bundle install
bin/rails db:prepare
bin/rails db:seed
bin/rails server -p 3003
```

### Frontend

Requirements: Node.js and npm.

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

The frontend expects the API at `http://localhost:3003`. Change `frontend/src/api/client.js` when using another API host.

For hosted deployment, set `VITE_API_URL` in the frontend environment. The backend includes a Render blueprint in `render.yaml`; set `DATABASE_URL`, `RAILS_MASTER_KEY`, `SECRET_KEY_BASE`, and `FRONTEND_ORIGINS` in the backend service. Safe variable templates are available in `frontend/.env.example` and `backend/.env.example`.

## Development Admin Accounts

The seed script creates or repairs these development accounts:

| Account | Password |
| --- | --- |
| `admin@medwin.com` | `Medwin@2026` |
| `dispatch@medwin.com` | `Dispatch@2026` |

Change these credentials before deploying anywhere public.

## Verification

```bash
cd frontend
npm run build
npm run lint

cd ../backend
bin/rails routes
```

See [DOCUMENTATION.md](DOCUMENTATION.md) for architecture, API routes, OTP behavior, deployment notes, and troubleshooting.

## Security Note

Never commit `backend/config/master.key`, production secrets, database dumps, logs, or real patient data. Configure production credentials through the deployment environment.