# Algo-Pivot

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

## Optional root scripts

The root `package.json` includes Bun-based shortcuts (`bun run dev`, `bun run build`) for frontend-only workflows.
