<div align="center">
  <img width="1200" height="475" title="PrismERP Banner"/>
  <h1 align="center">PrismERP — Advanced Business Suite</h1>
  <p align="center">A modern, AI-powered ERP for accounting, inventory, and business analytics.</p>
  <p align="center">
    <a href="https://prism-erp.vercel.app">Live Demo</a> •
    <a href="https://github.com/adi785/PrismERP/issues">Report an issue</a>
  </p>
</div>

---

## Why PrismERP?

PrismERP combines a React + TypeScript frontend with a Supabase backend and AI-powered analytics.

- Friendly UI and keyboard-first workflows
- Real-time inventory and ledger syncing
- AI-driven financial insights and anomaly detection
- Role-based access control for teams
- Optional n8n automation hooks for operational workflows

## Highlights

- Financial management: chart of accounts, multi-currency, trial balance, P&L
- Inventory: SKU, batch/serial tracking, FIFO/LIFO valuations
- Voucher-based entries: invoice, purchase, payment, receipt, journal
- AI analytics: Gemini-powered forecasting and anomaly detection
- Automation: authenticated Supabase-to-n8n event relay (see [n8n integration guide](docs/n8n/README.md))
- Secure by design: Supabase Auth and row-level access policies

## Tech stack

- Frontend: React + TypeScript + Vite
- Backend: Supabase (Postgres + Auth + Edge Functions)
- AI: Google Gemini through an authenticated Supabase Edge Function
- Automation: n8n webhooks through an authenticated Supabase Edge Function
- Charts: Recharts

## Project structure

```
PrismERP/
├── src/             # React app (UI, services, state)
├── backend/supabase # Supabase config and Edge Functions
├── docs/n8n/        # n8n setup guide and importable starter workflow
└── screenshots/     # App screenshots
```

## Architecture

React frontend ⇄ Supabase Auth/Postgres/Edge Functions ⇄ Gemini
                                             └──────⇄ n8n (optional)

## API examples

- POST /auth/v1/signup
- POST /auth/v1/signin
- GET /rest/v1/companies
- GET /rest/v1/ledgers?company_id={id}
- POST /rest/v1/vouchers
- POST /rest/v1/inventory_movements
- POST /functions/v1/gemini-proxy (authenticated)
- POST /functions/v1/n8n-event-relay (authenticated; allowlisted events)

## Local development

Prerequisites: Node 18+, npm, and a Supabase project.

```bash
git clone https://github.com/adi785/PrismERP.git
cd PrismERP
npm install
npm run dev
```

Configure your Supabase project credentials for self-hosting. Never put a
service-role key, Gemini API key, or n8n webhook secret in frontend code or
Vite environment variables. See [backend/README.md](backend/README.md) and
[docs/n8n/README.md](docs/n8n/README.md) for deployment instructions.

## Secure AI setup

The Gemini key is read only by the Edge Function at runtime. Configure
`GEMINI_API_KEY` using Supabase Function Secrets and deploy
`gemini-proxy`. Financial summaries and invoice images submitted to AI
features are sent to Google Gemini for processing; enable these features only
when your organization permits that data transfer.

## Contributing

1. Fork the repo.
2. Create a feature branch.
3. Open a PR with a clear description.
4. Add tests for new features and follow the existing code style.

## License

MIT — see LICENSE.

Built with ❤️ using React, TypeScript, Supabase, and AI — PrismERP Team
