# Language Admin

Internal admin dashboard for triaging `problem_reports` from the language app.
React + Vite + TypeScript. Talks to the `language-backend` admin API and signs
in with Supabase (the same project the backend uses).

## Setup

Secrets come from Doppler (same as the backend). Vite exposes any
`VITE_`-prefixed env var, so `doppler run` feeds them straight in.

```bash
npm install
doppler login            # once per machine
doppler setup            # pick the project/config that holds the VITE_* secrets
doppler run -- npm run dev   # http://localhost:5174
```

Required secrets in the selected Doppler config:

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — same Supabase project as the
  backend (anon/publishable key, not the service key).
- `VITE_API_BASE_URL` — `language-backend` base URL (e.g. `http://localhost:8000`).

For local-only work without Doppler you can instead copy `.env.example` to
`.env` and fill it in.

## Access

Sign in with a Supabase account whose email is listed in the backend's
`ADMIN_EMAILS` setting. Non-admin accounts get a 403 from the API.

## What it does

- Lists problem reports, filterable by status and issue type, paginated.
- Detail panel shows the full `target` / `client_context`, message, and metadata.
- Change a report's status (`open`/`triaged`/`resolved`/`dismissed`) and save a
  resolution note.

## Endpoints used

From `language-backend` (`docs/specs/problem-reports.md`):

- `GET /api/admin/problem-reports`
- `GET /api/admin/problem-reports/{id}`
- `PATCH /api/admin/problem-reports/{id}`

## Not yet built

Custom fix actions (regenerate TTS for `wrong_audio`, edit dictionary entries
for `wrong_definition`, etc.) — these need new backend endpoints first.
