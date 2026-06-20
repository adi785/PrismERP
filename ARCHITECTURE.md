# PrismERP - Detailed Architecture Documentation

## System Overview

PrismERP is a full-stack ERP system built on modern web technologies. This document provides technical deep-dives into the architecture, data flow, and integration patterns.

---

## Table of Contents

1. [Frontend Architecture](#frontend-architecture)
2. [Backend Architecture](#backend-architecture)
3. [Data Flow](#data-flow)
4. [State Management](#state-management)
5. [API Integration](#api-integration)
6. [Security Architecture](#security-architecture)
7. [Deployment Architecture](#deployment-architecture)

---

## Frontend Architecture

### Technology Stack

- **Framework**: React 18.3.1 (Hooks-based)
- **Language**: TypeScript 5.8.2
- **Build Tool**: Vite 6.2.0
- **State**: Zustand
- **UI**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **HTTP Client**: Supabase JS Client

### Component Hierarchy

```
App.tsx (Root Container)
├── ErrorBoundary (Error Handling)
├── Sidebar Navigation
│   ├── NavGroup (Grouped Navigation)
│   └── NavItem (Individual Menu Items)
├── Main Header
│   ├── Quick Actions Menu
│   └── Command Palette Toggle
├── Main Content (Dynamic)
│   ├── Dashboard
│   ├── LedgerList
│   ├── StockList
│   ├── VoucherEntry
│   ├── Billing
│   ├── Purchases
│   ├── ProductReturns
│   ├── DayBook
│   ├── Reports
│   ├── TaxCenter
│   ├── StockAdjustment
│   ├── ImportCenter
│   └── AIAnalyst
├── FloatingAssistant (AI Chat)
└── CommandPalette (Search & Navigation)
```

---

## Backend Architecture

### Supabase Infrastructure

Multi-tenant architecture with company-level data isolation and Row-Level Security (RLS).

#### Database Tables:
- `companies` - Organization management
- `users` - User profiles and roles
- `ledgers` - Chart of accounts
- `vouchers` - Transaction records
- `stock_items` - Inventory catalog
- `inventory_movements` - Stock tracking
- `batch_tracking` - Batch/Serial management

#### Authentication
- Email/password based with Supabase Auth
- JWT tokens for session management
- Automatic token refresh

---

## API Endpoints

### REST API Base
```
/rest/v1/
├── /auth/              - Authentication
├── /companies/         - Company management
├── /ledgers/          - General ledger
├── /vouchers/         - Vouchers
├── /stock_items/      - Inventory
└── /reports/          - Financial reports
```

### Edge Functions
```
/functions/v1/
├── analyze-financials  - AI analysis
├── forecast-trends     - Predictions
└── detect-anomalies    - Anomaly detection
```

---

## Security Architecture

### Authentication Flow
1. User credentials validation
2. JWT token issuance
3. Session creation
4. Company data initialization
5. Authenticated user access

### Authorization
- Role-Based Access Control (RBAC)
- Row-Level Security (RLS) policies
- Multi-tenant data isolation
- API key management

### Data Protection
- AES-256 encryption at rest
- TLS 1.3 encryption in transit
- Secure session handling
- Audit logging

---

## Deployment Architecture

### Frontend (Vercel)
- Automatic deployment on git push
- CDN distribution (49+ regions)
- SSL certificate management
- Environment variable injection

### Backend (Supabase)
- PostgreSQL database
- Real-time subscriptions
- Edge Functions (Deno)
- Automatic backups (24/7)
- DDoS protection

---

## Performance Optimization

### Frontend
- Code splitting with lazy loading
- Tailwind CSS optimization
- Tree-shaking unused code
- Component memoization

### Backend
- Database indexing
- Query optimization
- Connection pooling
- Response caching

---

## Future Enhancements

1. Offline support with Service Workers
2. Mobile application (React Native)
3. Advanced ML-based predictions
4. Third-party integration APIs
5. Webhook support
6. Multi-currency full support
7. Advanced audit trails

---

**For more details, see README.md**