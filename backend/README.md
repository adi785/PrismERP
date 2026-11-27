# Backend

The tracked Supabase backend contains the authenticated Gemini proxy and the
optional n8n event relay.

## Tracked structure

```
backend/
└── supabase/
    ├── config.toml
    └── functions/
        ├── _shared/
        │   └── aiProxy.js
        ├── gemini-proxy/
        │   └── index.ts
        └── n8n-event-relay/
            └── index.ts
```

## Deploy the AI function

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set GEMINI_API_KEY=<your-gemini-api-key>
supabase functions deploy gemini-proxy
```

Keep `GEMINI_API_KEY` in Supabase Function Secrets. Never put it in frontend
code, a `VITE_` variable, or Vite's `define` configuration.

## Deploy the n8n relay

See [the n8n integration guide](../docs/n8n/README.md). Configure
`N8N_WEBHOOK_URL` and optional `N8N_WEBHOOK_SECRET` as Supabase Function
Secrets, then deploy:

```bash
supabase secrets set N8N_WEBHOOK_URL=https://<your-n8n-host>/webhook/<your-path>
supabase secrets set N8N_WEBHOOK_SECRET=<long-random-shared-secret>
supabase functions deploy n8n-event-relay
```

Both functions require valid Supabase user JWTs. Never expose service-role or
webhook secrets to the browser.

## Database and RLS status

No SQL migration files are currently tracked under
`backend/supabase/migrations`. The frontend still depends on the configured
Supabase project and its deployed schema/RLS policies. Version and audit those
policies before treating the repository as a reproducible production backend.
