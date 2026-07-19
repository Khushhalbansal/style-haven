
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS return_policy text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS whatsapp_number text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS support_email text;
