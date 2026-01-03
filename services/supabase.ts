
import { createClient } from '@supabase/supabase-js';

/**
 * PRISMERP SUPABASE SQL SCHEMA (V4 - Tracking Enabled)
 * 
 * -- Update stock_items
 * ALTER TABLE public.stock_items ADD COLUMN tracking_type TEXT DEFAULT 'none';
 * 
 * -- New stock_tracking table
 * CREATE TABLE IF NOT EXISTS public.stock_tracking (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   item_id UUID REFERENCES stock_items(id) ON DELETE CASCADE,
 *   identifier TEXT NOT NULL,
 *   expiry_date DATE,
 *   current_qty DECIMAL DEFAULT 0,
 *   tracking_type TEXT CHECK (tracking_type IN ('batch', 'serial'))
 * );
 * 
 * -- Update inventory_movements
 * ALTER TABLE public.inventory_movements ADD COLUMN tracking_id UUID REFERENCES stock_tracking(id);
 * 
 * ALTER TABLE public.stock_tracking ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Manage tracking via company ownership" ON public.stock_tracking FOR ALL
 *   USING (item_id IN (SELECT id FROM stock_items s JOIN companies c ON s.company_id = c.id WHERE c.owner_id = auth.uid()));
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
