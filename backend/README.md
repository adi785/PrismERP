# Backend

The tracked Supabase backend currently contains the authenticated Gemini proxy. Database migrations and the historical migration sequence described in older documentation are not present in this repository yet; do not apply undocumented schema changes.

## Tracked structure

```
backend/
└── supabase/
    ├── config.toml
    └── functions/
        ├── _shared/
        │   └── aiProxy.js
        └── gemini-proxy/
            └── index.ts
```

## Deploy the AI function

Run from this directory:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set GEMINI_API_KEY=<your-gemini-api-key>
supabase functions deploy gemini-proxy
```

`GEMINI_API_KEY` must be stored as a Supabase function secret. It must never be placed in the frontend, a `VITE_` variable, or Vite's `define` configuration.

The function keeps `verify_jwt = true` and independently verifies the caller's user session with Supabase Auth. It validates supported actions and payload sizes, limits invoice images to JPEG/PNG/WebP and 5 MB in the UI, and does not return raw Gemini provider errors.

The default CORS allowlist contains `https://prism-erp.vercel.app`, `http://localhost:3000`, and `http://localhost:5173`. Configure `AI_ALLOWED_ORIGINS` as a comma-separated function secret if your app is hosted elsewhere.

## Database and RLS status

No SQL migration files are currently tracked under `backend/supabase/migrations`. The existing frontend still depends on the configured Supabase project and its deployed schema/RLS policies. Version and audit those policies before treating the repository as a reproducible production backend.
