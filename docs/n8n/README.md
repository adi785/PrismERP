# n8n automation integration

PrismERP can send selected business events to n8n through the authenticated
`n8n-event-relay` Supabase Edge Function. The browser never receives the n8n
webhook URL or shared secret.

## Architecture

```text
PrismERP (signed-in user)
        | Supabase Functions invoke + user JWT
        v
n8n-event-relay (verify JWT + auth.getUser)
        | HTTPS POST + optional shared-secret header
        v
n8n Webhook -> validation -> business automation
```

Allowlisted events:

| Event | Intended use | Suggested automation |
| --- | --- | --- |
| `voucher.created` | Voucher recorded | Notify finance or append to an approved accounting log |
| `inventory.low_stock` | Stock below reorder threshold | Send a replenishment alert |
| `report.daily_summary` | Daily summary ready | Deliver a management digest |

The current UI does not emit events automatically yet. Invoke
`sendAutomationEvent` only from a confirmed success path after persistence
succeeds. Do not dispatch before saving the ERP transaction.

## Supabase setup

From the repository root:

```bash
cd backend
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set N8N_WEBHOOK_URL=https://<your-n8n-host>/webhook/<your-path>
supabase secrets set N8N_WEBHOOK_SECRET=<long-random-shared-secret>
supabase functions deploy n8n-event-relay
```

Keep both values in Supabase Function Secrets. Never put them in `VITE_*`
variables, frontend source, screenshots, or commits. Hosted n8n must use HTTPS.

The function verifies the caller's Supabase user token, restricts event names,
limits payloads to 16 KB, applies an 8-second timeout, and forwards the secret
in `X-PrismERP-Webhook-Secret`. Configure n8n to compare this header against
a credential/secret stored in n8n; never echo secrets into execution logs.
This is an optional downstream integration. A failed delivery must not undo a
saved transaction; callers should treat dispatch as best-effort.

## Event envelope

```json
{
  "id": "unique-event-id",
  "event": "voucher.created",
  "occurred_at": "2026-01-01T10:00:00.000Z",
  "actor": { "user_id": "supabase-auth-user-id" },
  "payload": {
    "voucher_id": "voucher-id",
    "voucher_number": "INV-001",
    "voucher_type": "Sales",
    "total_amount": 1250,
    "currency": "INR"
  }
}
```

Include only the minimum data needed. Avoid customer contact details, bank
data, tax identifiers, and line-item descriptions unless the business has
approved that transfer and the n8n instance is secured. Treat delivery as
at-least-once and use envelope `id` for downstream idempotency.

## Importable starter workflow

Import `workflows/prism-event-router.json` into n8n. Configure the Webhook
node URL to match `N8N_WEBHOOK_URL`, enable header authentication or add a
secret-validation step before the Switch node, and activate the workflow. The
starter routes the three event types and intentionally performs no side effects.

## Smoke test

Invoke the Edge Function with a valid signed-in user's JWT. A supported event
returns HTTP 202 and `accepted: true`; unsupported events return HTTP 400,
missing/expired sessions HTTP 401, an unset webhook HTTP 503, and delivery
failures HTTP 502.

## Production checklist

- Use authenticated n8n webhook access or validate the shared-secret header.
- Restrict network access to n8n where practical.
- Keep downstream credentials in n8n Credentials, not workflow JSON.
- Add idempotency using the envelope `id` before sending messages/creating data.
- Configure retries and dead-letter handling in n8n for downstream failures.
- Review data residency, retention, access control, and vendor policies before
  transferring financial or personal data.
- Add event emission only at confirmed persistence success boundaries.
