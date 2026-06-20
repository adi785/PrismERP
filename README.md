<div align="center">
<img width="1200" height="475" alt="PrismERP Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# PrismERP - Advanced Business Suite

A modern, AI-powered Enterprise Resource Planning (ERP) system built with React, TypeScript, and Supabase. Designed for seamless accounting, inventory management, and business analytics.

**Live Demo:** https://prism-erp.vercel.app

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture Diagram](#architecture-diagram)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Authentication Flow](#authentication-flow)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Features](#features)
- [Environment Setup](#environment-setup)

---

## Overview

PrismERP is a comprehensive ERP suite designed for small to medium-sized businesses. It provides:

- **Financial Management**: Complete ledger system with multi-currency support
- **Inventory Tracking**: Real-time stock management with batch/serial tracking
- **Sales & Purchases**: Invoice generation and bill management
- **AI Analytics**: Intelligent financial analysis powered by Google Gemini
- **Tax Compliance**: Automated GST calculations and tax reporting
- **Multi-user Support**: Role-based access control (Admin, Accountant, Staff)

---

## Tech Stack

### Frontend
- **Framework**: React 18.3.1
- **Language**: TypeScript 5.8.2
- **Build Tool**: Vite 6.2.0
- **UI Components**: Lucide React (icons)
- **Charts**: Recharts 2.12.7
- **Markdown**: React Markdown with GFM support

### Backend & Services
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI Integration**: Google Gemini API (@google/genai 1.34.0)
- **Client SDK**: @supabase/supabase-js 2.45.0

### Development
- **Plugin**: Vite React (@vitejs/plugin-react 5.0.0)
- **Node Types**: @types/node 22.14.0

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  App.tsx (Main Container)                        │  │
│  ├─ Navigation & Sidebar                            │  │
│  ├─ View Router (Dashboard, Ledgers, Stock, etc)   │  │
│  └─ Error Boundary & Loading States                │  │
│  ├─ Components/                                      │  │
│  │  ├─ Dashboard (Overview & KPIs)                 │  │
│  │  ├─ LedgerList (Chart of Accounts)             │  │
│  │  ├─ StockList (Inventory Management)           │  │
│  │  ├─ VoucherEntry (Transaction Recording)       │  │
│  │  ├─ Billing (Sales Invoicing)                  │  │
│  │  ├─ Purchases (Purchase Orders)                │  │
│  │  ├─ DayBook (Daily Transactions)               │  │
│  │  ├─ Reports (Financial Statements)             │  │
│  │  ├─ TaxCenter (GST Compliance)                 │  │
│  │  ├─ AIAnalyst (Gemini Integration)             │  │
│  │  ├─ Auth (Login & Company Setup)               │  │
│  │  └─ CommandPalette (Global Search & Actions)   │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Store (Zustand State Management)                │  │
│  ├─ useERPStore (Global State)                      │  │
│  │  ├─ User & Authentication State                │  │
│  │  ├─ Company & Financial Year Data              │  │
│  │  ├─ Ledger, Stock & Voucher Data              │  │
│  │  ├─ Theme (Dark/Light Mode)                   │  │
│  │  └─ Sync Status                                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/REST API
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase Backend (PostgreSQL)              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Authentication                                 │  │
│  │  - User Sessions & JWT Tokens                  │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Database Tables                                │  │
│  │  ├─ companies                                  │  │
│  │  ├─ users                                      │  │
│  │  ├─ ledgers & ledger_entries                  │  │
│  │  ├─ stock_items & inventory_movements        │  │
│  │  ├─ vouchers & voucher_entries                │  │
│  │  ├─ tax_transactions                          │  │
│  │  └─ audit_logs                                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          │ Integration
                          ▼
┌─────────────────────────────────────────────────────────┐
│           Google Gemini API (AI Services)               │
│  ├─ Financial Analysis & Insights                      │
│  ├─ Trend Analysis & Predictions                       │
│  ├─ Report Generation Assistance                       │
│  └─ Anomaly Detection                                  │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Core Tables

#### `companies`
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  gstin VARCHAR(15) UNIQUE,
  financial_year VARCHAR(10),
  address TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) CHECK (role IN ('Admin', 'Accountant', 'Staff')),
  created_at TIMESTAMP DEFAULT now()
);
```

#### `ledgers`
```sql
CREATE TABLE ledgers (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  group VARCHAR(100),
  type VARCHAR(50) CHECK (type IN ('Asset', 'Liability', 'Equity', 'Income', 'Expense')),
  opening_balance DECIMAL(15, 2) DEFAULT 0,
  current_balance DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);
```

#### `vouchers`
```sql
CREATE TABLE vouchers (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  number VARCHAR(50) UNIQUE NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(50) CHECK (type IN ('Sales', 'Purchase', 'Payment', 'Receipt', 'Contra', 'Journal')),
  narration TEXT,
  total_amount DECIMAL(15, 2),
  gst_total DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT now()
);
```

#### `voucher_entries`
```sql
CREATE TABLE voucher_entries (
  id UUID PRIMARY KEY,
  voucher_id UUID NOT NULL REFERENCES vouchers(id),
  ledger_id UUID NOT NULL REFERENCES ledgers(id),
  debit DECIMAL(15, 2) DEFAULT 0,
  credit DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);
```

#### `stock_items`
```sql
CREATE TABLE stock_items (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  hsn VARCHAR(50),
  unit VARCHAR(50),
  opening_stock DECIMAL(12, 2) DEFAULT 0,
  current_stock DECIMAL(12, 2) DEFAULT 0,
  purchase_price DECIMAL(12, 2),
  sale_price DECIMAL(12, 2),
  gst_rate DECIMAL(5, 2),
  tracking_type VARCHAR(50) CHECK (tracking_type IN ('none', 'batch', 'serial')),
  created_at TIMESTAMP DEFAULT now()
);
```

#### `inventory_movements`
```sql
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY,
  stock_item_id UUID NOT NULL REFERENCES stock_items(id),
  quantity DECIMAL(12, 2) NOT NULL,
  rate DECIMAL(12, 2),
  amount DECIMAL(15, 2),
  type VARCHAR(10) CHECK (type IN ('In', 'Out')),
  tracking_id UUID REFERENCES batch_tracking(id),
  created_at TIMESTAMP DEFAULT now()
);
```

#### `batch_tracking`
```sql
CREATE TABLE batch_tracking (
  id UUID PRIMARY KEY,
  stock_item_id UUID NOT NULL REFERENCES stock_items(id),
  identifier VARCHAR(100) NOT NULL,
  expiry_date DATE,
  current_qty DECIMAL(12, 2),
  type VARCHAR(50) CHECK (type IN ('batch', 'serial')),
  created_at TIMESTAMP DEFAULT now()
);
```

---

## API Endpoints

### Authentication
- `POST /auth/v1/signup` - Register new user
- `POST /auth/v1/signin` - Login user
- `POST /auth/v1/logout` - Logout user
- `POST /auth/v1/refresh` - Refresh JWT token

### Companies
- `GET /rest/v1/companies` - List companies for user
- `POST /rest/v1/companies` - Create new company
- `GET /rest/v1/companies/{id}` - Get company details
- `PUT /rest/v1/companies/{id}` - Update company
- `DELETE /rest/v1/companies/{id}` - Delete company

### Ledgers
- `GET /rest/v1/ledgers?company_id={id}` - List ledgers
- `POST /rest/v1/ledgers` - Create ledger
- `GET /rest/v1/ledgers/{id}` - Get ledger details
- `PUT /rest/v1/ledgers/{id}` - Update ledger
- `DELETE /rest/v1/ledgers/{id}` - Delete ledger

### Vouchers
- `GET /rest/v1/vouchers?company_id={id}` - List vouchers
- `POST /rest/v1/vouchers` - Create voucher
- `GET /rest/v1/vouchers/{id}` - Get voucher details
- `PUT /rest/v1/vouchers/{id}` - Update voucher
- `DELETE /rest/v1/vouchers/{id}` - Delete voucher

### Stock Items
- `GET /rest/v1/stock_items?company_id={id}` - List stock items
- `POST /rest/v1/stock_items` - Create stock item
- `GET /rest/v1/stock_items/{id}` - Get stock item details
- `PUT /rest/v1/stock_items/{id}` - Update stock item
- `DELETE /rest/v1/stock_items/{id}` - Delete stock item

### Inventory
- `GET /rest/v1/inventory_movements?item_id={id}` - Get movements for item
- `POST /rest/v1/inventory_movements` - Record movement
- `GET /rest/v1/batch_tracking?item_id={id}` - List batch/serial tracking

### Reports
- `GET /rest/v1/reports/trial_balance?company_id={id}` - Trial Balance
- `GET /rest/v1/reports/profit_loss?company_id={id}` - P&L Statement
- `GET /rest/v1/reports/balance_sheet?company_id={id}` - Balance Sheet
- `GET /rest/v1/reports/gst_summary?company_id={id}` - GST Compliance

### AI Analysis (Gemini Integration)
- `POST /functions/v1/analyze-financials` - Get financial insights
- `POST /functions/v1/forecast-trends` - Predict trends
- `POST /functions/v1/detect-anomalies` - Find anomalies

---

## Authentication Flow

```
User Input (Email/Password)
         │
         ▼
┌─────────────────────┐
│  Auth Component     │
│  - Login Form       │
│  - Company Setup    │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Supabase Auth       │
│ - Verify Email      │
│ - Create Session    │
│ - Issue JWT Token   │
└─────────────────────┘
         │
    ┌────┴────┐
    │          │
   YES        NO
    │          │
    ▼          ▼
┌────────┐  ┌──────────────┐
│ Fetch  │  │ Show Error   │
│ User   │  │ & Retry      │
│ Data   │  └──────────────┘
└────────┘
    │
    ▼
┌─────────────────────────────┐
│ Check Company Association   │
│ - Create if First Time      │
│ - Load Existing if Return   │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ Initialize Global Store     │
│ - Load Ledgers              │
│ - Load Stock Items          │
│ - Load Vouchers             │
│ - Set Theme Preference      │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ Redirect to Dashboard       │
│ - Authenticated Session     │
│ - Ready for Operations      │
└─────────────────────────────┘
```

### Session Management
- JWT tokens stored in Supabase session
- Automatic token refresh on expiry
- Secure logout clears all sessions
- Dark mode preference persisted per user

---

## Project Structure

```
PrismERP/
├── frontend/
│   └── [Frontend source files]
│
├── backend/
│   └── [Backend documentation and configs]
│
├── screenshots/
│   └── [Project screenshots and visuals]
│
├── .gitignore
├── README.md (this file)
└── ARCHITECTURE.md (Detailed technical documentation)
```

---

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Google Gemini API key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/adi785/PrismERP.git
   cd PrismERP
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Update `.env.local` with your credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:5173`

5. **Build for production:**
   ```bash
   npm run build
   npm run preview
   ```

---

## Features

### 📊 Financial Management
- Complete Chart of Accounts
- Multi-level Ledger hierarchy
- Real-time balance tracking
- Trial Balance & Financial Statements
- Currency support

### 📦 Inventory Management
- SKU-based stock tracking
- Batch & Serial number tracking
- FIFO/LIFO valuation methods
- Stock adjustment & reconciliation
- Low stock alerts

### 💼 Business Operations
- Sales Invoice generation
- Purchase Order management
- Product Returns processing
- Day Book for daily transactions
- Voucher-based entry system

### 📈 Reports & Analytics
- Profit & Loss Statements
- Balance Sheet
- Cash Flow Analysis
- GST Compliance Reports
- Customizable Financial Reports

### 🤖 AI-Powered Features
- Financial data analysis with Gemini
- Trend prediction & forecasting
- Anomaly detection
- Intelligent report generation
- Natural language queries

### 🔐 Security & Compliance
- Role-based access control
- Audit logging
- Data encryption
- GST calculation automation
- Secure authentication

---

## Environment Setup

### Frontend Environment Variables

Create a `.env.local` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Google Gemini API
VITE_GEMINI_API_KEY=your_gemini_api_key

# App Configuration
VITE_APP_NAME=PrismERP
VITE_APP_VERSION=1.0.0
```

### Backend Setup (Supabase)

1. Create a new Supabase project
2. Run migrations from `backend/supabase/migrations/`
3. Set up authentication policies
4. Configure edge functions
5. Enable real-time subscriptions

---

## Development

### Build Commands
```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
```

### Code Structure
- Components use functional React hooks
- Zustand for state management
- TypeScript for type safety
- Tailwind CSS for styling
- Lucide React for icons

---

## Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Environment Variables on Vercel
Add your `.env.local` variables to Vercel project settings.

---

## Support & Documentation

- **Live Demo**: https://prism-erp.vercel.app
- **Repository**: https://github.com/adi785/PrismERP
- **Issues**: https://github.com/adi785/PrismERP/issues
- **Discussions**: https://github.com/adi785/PrismERP/discussions

---

## License

This project is open source and available under the MIT License.

---

**Built with ❤️ using React, TypeScript, and AI**