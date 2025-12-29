
import { createClient } from '@supabase/supabase-js';

/**
 * PRISMERP SUPABASE SQL SCHEMA
 * Copy and Paste the following into your Supabase SQL Editor:
 * 
 * -- 0. Profiles Table for Roles
 * CREATE TABLE IF NOT EXISTS public.profiles (
 *   id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
 *   name TEXT,
 *   role TEXT CHECK (role IN ('Admin', 'Accountant', 'Staff')) DEFAULT 'Staff'
 * );
 *
 * -- Automatically create a profile for new users
 * CREATE OR REPLACE FUNCTION public.handle_new_user() 
 * RETURNS TRIGGER AS $$
 * BEGIN
 *   INSERT INTO public.profiles (id, name, role)
 *   VALUES (new.id, new.raw_user_meta_data->>'name', COALESCE(new.raw_user_meta_data->>'role', 'Staff'));
 *   RETURN NEW;
 * END;
 * $$ LANGUAGE plpgsql SECURITY DEFINER;
 * 
 * CREATE OR REPLACE TRIGGER on_auth_user_created
 *   AFTER INSERT ON auth.users
 *   FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
 *
 * -- 1. Companies Table
 * CREATE TABLE IF NOT EXISTS companies (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   name TEXT NOT NULL,
 *   gstin TEXT,
 *   financial_year TEXT,
 *   address TEXT,
 *   owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
 * );
 * 
 * -- 2. Ledgers Table
 * CREATE TABLE IF NOT EXISTS ledgers (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
 *   name TEXT NOT NULL,
 *   "group" TEXT NOT NULL,
 *   type TEXT NOT NULL,
 *   opening_balance DECIMAL DEFAULT 0,
 *   current_balance DECIMAL DEFAULT 0
 * );
 * 
 * -- 3. Stock Items Table
 * CREATE TABLE IF NOT EXISTS stock_items (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
 *   name TEXT NOT NULL,
 *   sku TEXT NOT NULL,
 *   hsn TEXT,
 *   unit TEXT DEFAULT 'Nos',
 *   opening_stock DECIMAL DEFAULT 0,
 *   current_stock DECIMAL DEFAULT 0,
 *   purchase_price DECIMAL DEFAULT 0,
 *   sale_price DECIMAL DEFAULT 0,
 *   gst_rate DECIMAL DEFAULT 18
 * );
 * 
 * -- 4. Vouchers Table
 * CREATE TABLE IF NOT EXISTS vouchers (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
 *   number TEXT NOT NULL,
 *   date DATE NOT NULL,
 *   type TEXT NOT NULL,
 *   narration TEXT,
 *   total_amount DECIMAL DEFAULT 0,
 *   gst_total DECIMAL DEFAULT 0
 * );
 * 
 * -- 5. Voucher Entries Table
 * CREATE TABLE IF NOT EXISTS voucher_entries (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   voucher_id UUID REFERENCES vouchers(id) ON DELETE CASCADE,
 *   ledger_id UUID REFERENCES ledgers(id) ON DELETE CASCADE,
 *   debit DECIMAL DEFAULT 0,
 *   credit DECIMAL DEFAULT 0
 * );
 * 
 * -- Enable Row Level Security (RLS)
 * ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE voucher_entries ENABLE ROW LEVEL SECURITY;
 * 
 * -- Policies
 * CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
 * CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
 * CREATE POLICY "Manage own companies" ON companies FOR ALL USING (auth.uid() = owner_id);
 * CREATE POLICY "Manage own ledgers" ON ledgers FOR ALL USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
 * CREATE POLICY "Manage own stock" ON stock_items FOR ALL USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
 * CREATE POLICY "Manage own vouchers" ON vouchers FOR ALL USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
 * CREATE POLICY "Manage own entries" ON voucher_entries FOR ALL USING (voucher_id IN (SELECT id FROM vouchers v JOIN companies c ON v.company_id = c.id WHERE c.owner_id = auth.uid()));
 */

const supabaseUrl = 'https://nynylvctgglpeureuulf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bnlsdmN0Z2dscGV1cmV1dWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NTA0OTksImV4cCI6MjA4MjIyNjQ5OX0.5KxDfBKtENO6rN13XQfBrRShB5hBTiqdtSh6FH-129g';

export const isSupabaseConfigured = Boolean(supabaseUrl) && Boolean(supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
