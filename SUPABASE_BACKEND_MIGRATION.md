# Supabase Deployment Error Fix (Backend Migration)

This project now runs with FastAPI + PostgreSQL and does not require Supabase Edge Function deployment.

## Why 403 happened
Figma Make auto-detected `/supabase/functions` and attempted deployment to Supabase, returning `403 Forbidden`.

## What is fixed in this repo
- Added `backend/` FastAPI service with `/api/*` routes.
- Frontend API layer (`src/app/api/index.ts`) now targets `VITE_API_BASE_URL` (default `http://127.0.0.1:8000/api`).
- Auth flow now uses JWT backend login instead of hardcoded local credentials.
- LocalStorage is only used as fallback cache when backend is unavailable.

## Deployment guidance
1. Run backend separately (Docker/VM/Render/Railway/etc.).
2. Set frontend env: `VITE_API_BASE_URL=https://<your-backend>/api`.
3. In Figma Make, disconnect Supabase integration if still connected to stop 403 deployment noise.
