# n8n automation integration

PrismERP can send selected business events to an n8n webhook through the
authenticated `n8n-event-relay` Supabase Edge Function. The browser never
receives the n8n webhook URL or shared secret.

## Architecture

```text
PrismERP (signed-in user)
        |
        | Supabase Functions invoke + user JWT
        v
n8n-event-relay (verify JWT + auth.getUser)
        |
        | HTTPS POST + optional shared-secret header
        v
n8n Webhook -> validation -> business automation
```

The relay currently accepts these event names only:

| Event | Intended use | Suggested n8n action |
| --- | --- | --- |
| `voucher.created` | A voucher was recorded | Notify finance, append to an approved accounting log |
| `inventory.low_stock` | A stock item is below its reorder threshold | Send a replenishment alert |
| `report.daily_summary` | A daily summary is ready | Deliver a scheduled management digest |

No event is emitted automatically by the current UI yet. Call
`sendAutomationEvent` from a confirmed success path only after the matching
ERP operation has completed. Do not call it before persistence succeeds.

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

Use the production webhook URL (not the n8n test URL) after activating the
workflow. Keep the webhook URL and shared secret in Supabase Function Secrets.
Do not add them to `VITE_*` variables, frontend source, screenshots, or commits.
Use HTTPS for hosted n8n. The relay has a short request timeout and returns a
gateway error when n8n is unavailable; the ERP caller should treat automation
as best-effort and must not reverse an already-saved transaction.

The Edge Function checks the Supabase user session and validates the event
allowlist and payload shape/size. The configured secret is sent as
`X-PrismERP-Webhook-Secret`; configure the first n8n node or a following
validation node to compare it using a credential/secret stored in n8n. Never
echo the secret in execution logs or send it to downstream services.

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

Payloads should contain only the minimum data needed by the workflow. Avoid
customer contact details, bank data, tax identifiers, line-item descriptions,
or other sensitive financial information unless the business has approved
that specific data transfer and the n8n instance is appropriately secured.
Treat webhook deliveries as at-least-once: use the envelope `id` for
idempotency in downstream workflows.

## Starter workflow

Import `workflows/prism-event-router.json` into n8n. Set the Webhook node
path and authentication to match your deployment, add a secret comparison
before routing, and activate the workflow. The included starter intentionally
routes only the three allowlisted events and does not perform external actions.

## Smoke test

After deploying and signing in to PrismERP, call the helper from an authorized
success path or invoke the Edge Function in the Supabase dashboard with a valid
user JWT. A valid event should return HTTP 202 with `accepted: true`.
Unsupported event names should return HTTP 400; missing/expired sessions
should return HTTP 401; an unconfigured webhook should return HTTP 503.

## Production checklist

- Use an authenticated n8n webhook or validate the shared-secret header.
- Restrict network access to the n8n instance where practical.
- Keep n8n credentials in n8n Credentials, not workflow JSON.
- Add idempotency using `id` before sending messages or creating records.
- Configure retries/dead-letter handling in n8n for transient downstream failures.
- Review data residency, retention, access control, and vendor policies before
  sending financial or personal data outside Supabase.
- Add event emission only at transaction success boundaries and test each path.
