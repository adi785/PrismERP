# Backend Documentation

This directory contains backend configurations and database schemas for PrismERP.

## Structure

```
backend/
├── supabase/
│   ├── migrations/     - Database migration scripts
│   ├── functions/      - Edge functions
│   ├── triggers/       - Database triggers
│   └── supabase.yml    - Supabase configuration
└── README.md
```

## Setup Instructions

1. Create a Supabase project at https://supabase.com
2. Run migrations in order: `001_create_companies.sql` through `007_create_batch_tracking.sql`
3. Configure RLS policies
4. Deploy edge functions
5. Enable real-time subscriptions

## Database Schema

See main README.md for detailed database schema documentation.

## API Integration

Backend APIs are consumed by the frontend application via Supabase REST API and Edge Functions.

## Support

For issues or questions, please refer to the main repository issues page.
