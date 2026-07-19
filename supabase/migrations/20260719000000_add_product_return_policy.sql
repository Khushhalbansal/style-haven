-- Add return_policy column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS return_policy text DEFAULT '7-day return & replacement';
