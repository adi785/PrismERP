# PrismERP - Detailed Architecture Documentation

## System Overview

PrismERP is a React, TypeScript, Vite, and Supabase ERP. Supabase provides
authentication, Postgres access, and server-side Edge Functions. Optional n8n
workflows can orchestrate approved business events.

## Frontend Architecture

- React 18.3.1 with hooks
- TypeScript 5.8 and Vite
- Application state in the ERP store
- Tailwind CSS UI
- Supabase JS client for authentication and data access

## Backend Architecture

Supabase provides Postgres, Auth, and Edge Functions. The tracked AI gateway
is `gemini-proxy`; the optional automation gateway is `n8n-event-relay`.

### n8n event relay

The frontend invokes the relay with the current Supabase user JWT. The
function independently verifies that token using Supabase Auth, validates an
allowlisted event name, enforces a bounded payload, and forwards a minimal
event envelope to a configured HTTPS n8n webhook. The n8n URL and optional
shared-secret header are stored as Supabase Function Secrets.

Allowlisted events:
- `voucher.created`
- `inventory.low_stock`
- `report.daily_summary`

See [docs/n8n/README.md](docs/n8n/README.md) for setup and an importable
starter workflow. Event emission must be added at confirmed persistence
success paths; the integration does not claim UI events are already wired.

## Security Architecture

- Supabase JWT verification and explicit user lookup for the relay
- Database access remains subject to Supabase RLS
- The n8n relay does not use a service-role credential
- n8n endpoint and shared secret are server-side only
- Event allowlisting and payload-size limits reduce unintended data transfer
- Financial and personal data should be minimized and transferred only with
  organizational approval

## Deployment Architecture

- Frontend: Vercel
- Backend: Supabase (Postgres, Auth, Edge Functions)
- Optional workflow orchestration: self-hosted or managed n8n endpoint

## Operational Considerations

n8n is an optional downstream integration. A webhook failure must not undo a
saved ERP transaction. Use idempotency keys, retry/dead-letter handling,
restricted n8n access, and scoped credentials for downstream actions.
