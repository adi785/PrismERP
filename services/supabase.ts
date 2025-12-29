import { createClient } from '@supabase/supabase-js';

/**
 * PRISMERP SUPABASE SQL SCHEMA (V2 - Granular Policies)
 * Copy and Paste the following into your Supabase SQL Editor:
 * 
 * -- 0. Profiles Table
 * CREATE TABLE IF NOT EXISTS public.profiles (
 *   id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
 *   name TEXT,
 *   role TEXT CHECK (role IN ('Admin', 'Accountant', 'Staff')) DEFAULT 'Staff'
 * );
 *
 * -- Profile Trigger
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
 * CREATE TABLE IF NOT EXISTS public.companies (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   name TEXT NOT NULL,
 *   gstin TEXT,
 *   financial_year TEXT,
 *   address TEXT,
 *   owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid()
 * );
 * 
 * -- 2. Ledgers Table
 * CREATE TABLE IF NOT EXISTS public.ledgers (
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
 * CREATE TABLE IF NOT EXISTS public.stock_items (
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
 * CREATE TABLE IF NOT EXISTS public.vouchers (
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
 * CREATE TABLE IF NOT EXISTS public.voucher_entries (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   voucher_id UUID REFERENCES vouchers(id) ON DELETE CASCADE,
 *   ledger_id UUID REFERENCES ledgers(id) ON DELETE CASCADE,
 *   debit DECIMAL DEFAULT 0,
 *   credit DECIMAL DEFAULT 0
 * );
 * 
 * -- Enable RLS
 * ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.ledgers ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.voucher_entries ENABLE ROW LEVEL SECURITY;
 * 
 * -- Detailed Granular Policies for Companies
 * CREATE POLICY "Users can view their own companies" ON public.companies FOR SELECT USING (auth.uid() = owner_id);
 * CREATE POLICY "Users can create their own companies" ON public.companies FOR INSERT WITH CHECK (auth.uid() = owner_id);
 * CREATE POLICY "Users can update their own companies" ON public.companies FOR UPDATE USING (auth.uid() = owner_id);
 * CREATE POLICY "Users can delete their own companies" ON public.companies FOR DELETE USING (auth.uid() = owner_id);
 * 
 * -- Policies for Ledgers (Cascaded via Company Check)
 * CREATE POLICY "Manage ledgers via company ownership" ON public.ledgers FOR ALL 
 *   USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()))
 *   WITH CHECK (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
 *
 * -- Repeat for Stock, Vouchers, and Entries
 * CREATE POLICY "Manage stock via company ownership" ON public.stock_items FOR ALL 
 *   USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()))
 *   WITH CHECK (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
 *
 * CREATE POLICY "Manage vouchers via company ownership" ON public.vouchers FOR ALL 
 *   USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()))
 *   WITH CHECK (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
 *
 * CREATE POLICY "Manage entries via company ownership" ON public.voucher_entries FOR ALL 
 *   USING (voucher_id IN (SELECT id FROM vouchers v JOIN companies c ON v.company_id = c.id WHERE c.owner_id = auth.uid()))
 *   WITH CHECK (voucher_id IN (SELECT id FROM vouchers v JOIN companies c ON v.company_id = c.id WHERE c.owner_id = auth.uid()));
 * 
 * -- CRITICAL POST-SETUP STEP:
 * -- Go to Supabase Dashboard > Authentication > Providers > Email
 * -- Turn OFF "Confirm email" to allow immediate user login.
 */

const supabaseUrl = 'https://uqjysvmpojhmsrsyoxwv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxanlzdm1wb2pobXNyc3lveHd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMDEyMDAsImV4cCI6MjA4MjU3NzIwMH0.Z3ii3OqemYFp_UWV7n8uYEGHOs8XI-gxsVMpuXe-1OQ';

export const isSupabaseConfigured = Boolean(supabaseUrl) && Boolean(supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;