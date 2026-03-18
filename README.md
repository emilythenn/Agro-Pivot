# Agro-Pivot

Local development guide for running the frontend and backend.

## Prerequisites

- Node.js 20+ and npm
- Docker Desktop (or Docker Engine) running locally
- Supabase CLI (`npx supabase` is used by backend scripts)

## Run the frontend

From the repo root:

```bash
cd frontend
npm install
npm run dev
```

Frontend starts with Vite (default: `http://localhost:5173`).

## Run the backend (Supabase + Edge Functions)

From the repo root:

```bash
cd backend
npm install
npm run dev
```

1. Add environment variables for functions in `backend/supabase/.env`.
2. Start local Supabase services:

```bash
npm run local:start
```

3. Serve all edge functions locally:

```bash
npm run functions:serve
```

Or serve only the agro chat function:

```bash
npm run functions:serve:agro
```

Useful backend commands:

```bash
npm run local:stop     # stop local Supabase services
npm run db:reset       # reset local database
npm run supabase:status
```

## Email confirmation and SMTP setup

To make signup confirmation links and emails work correctly, configure both frontend and Supabase Auth:

1. Frontend redirect URL (`frontend/.env`):

```env
VITE_AUTH_REDIRECT_URL="http://localhost:5173/login"
```

2. Supabase Auth URL configuration (Dashboard -> Authentication -> URL Configuration):

- Site URL: `http://localhost:5173`
- Redirect URLs:
	- `http://localhost:5173/login`
	- your production login URL (for deployed environment)

3. Supabase Auth SMTP provider (Dashboard -> Authentication -> SMTP Settings):

- Host: `smtp-relay.brevo.com`
- Port: `587`
- Username: your Brevo SMTP login
- Password: your Brevo SMTP key/password
- Sender email: verified sender in Brevo

4. Edge function email for privacy/permissions notice (`backend/supabase/.env`):

```env
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender@example.com
BREVO_SENDER_NAME=Agro-Pivot
```

Then deploy functions after updating secrets:

```bash
cd backend
npx supabase functions deploy signup-notice
npx supabase functions deploy weather-ai
```

## Optional root scripts

The root `package.json` includes Bun-based shortcuts (`bun run dev`, `bun run build`) for frontend-only workflows.
