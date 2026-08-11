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

## ✨ Why PrismERP?

PrismERP is built to make business finance and inventory management beautiful, fast, and intelligent. It combines a clean React + TypeScript frontend with a Supabase backend and AI-powered analytics.

- Friendly UI and keyboard-first workflows
- Real-time inventory & ledger syncing
- AI-driven financial insights and anomaly detection
- Role-based access control for teams

---

## 🚀 Quick demo

Try the live demo: https://prism-erp.vercel.app

---

## 🧭 Highlights

- Financial Management: full chart of accounts, multi-currency, trial balance, P&L
- Inventory Management: SKU, batch/serial tracking, FIFO/LIFO valuations
- Voucher-based entries: invoice, purchase, payment, receipt, journal
- AI Analytics: Gemini-powered forecasting and anomaly detection
- Secure by design: Supabase Auth + role-based access + audit logs

---

## 🛠️ Tech Stack

- Frontend: React + TypeScript + Vite
- State: Zustand
- Styling: Tailwind CSS
- Backend: Supabase (Postgres + Auth + Edge Functions)
- AI: Google Gemini (@google/genai)
- Charts: Recharts

---

## 🗂️ Project structure

```
PrismERP/
├── frontend/        # React app (UI, components, pages)
├── backend/         # Supabase migrations & edge functions
├── screenshots/     # App screenshots for docs & marketing
├── README.md        # Project README
└── ARCHITECTURE.md  # Deep-dive architecture & design
```

---

## 🧩 Architecture (At a glance)

Frontend (React) ⇄ REST / Supabase ⇄ Supabase/Postgres ⇄ Google Gemini (AI)

Key pieces:
- App shell, routing, and components (Dashboard, Ledgers, Stock, Vouchers)
- Global store (Zustand) for session & offline sync
- Supabase for auth, realtime, and REST
- Edge functions for AI integrations and heavy tasks

---

## 🗃️ Database (core tables)

- companies — company metadata and GSTIN
- users — app users, roles and company mapping
- ledgers — chart of accounts and balances
- vouchers & voucher_entries — transactions and line items
- stock_items, inventory_movements, batch_tracking — inventory & tracking

(See backend migrations for full SQL and constraints.)

---

## 🔌 API (examples)

Authentication
- POST /auth/v1/signup
- POST /auth/v1/signin

Companies
- GET /rest/v1/companies
- POST /rest/v1/companies

Ledgers & Vouchers
- GET /rest/v1/ledgers?company_id={id}
- POST /rest/v1/vouchers

Inventory
- GET /rest/v1/stock_items?company_id={id}
- POST /rest/v1/inventory_movements

AI Endpoints
- POST /functions/v1/analyze-financials
- POST /functions/v1/forecast-trends
- POST /functions/v1/detect-anomalies

---

## ⚡ Quick start (local)

Prerequisites: Node 18+, npm or yarn, Supabase account, Google Gemini API key

1. Clone
```bash
git clone https://github.com/adi785/PrismERP.git
cd PrismERP
```

2. Install
```bash
npm install
```

3. Configure env
```bash
cp .env.example .env.local
# update .env.local with your Supabase + Gemini credentials
```

4. Run
```bash
npm run dev
# open http://localhost:5173
```

5. Build for production
```bash
npm run build
npm run preview
```

---

## ✅ Development notes

- Migrations located at: backend/supabase/migrations/
- Use Supabase dashboard to inspect tables & policies
- Edge functions live in backend/supabase/functions/

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

1. Fork the repo
2. Create a branch (feature/xxx)
3. Open a PR with a clear description

Please add tests for new features and follow the existing code style.

---

## 📸 Screenshots

Add high-quality screenshots to /screenshots for marketing and docs. Recommended: 1920×1080, optimized PNGs.

---

## 📄 License

MIT — see LICENSE file.

---

Built with ❤️ using React, TypeScript, Supabase, and AI — PrismERP Team
