-- Add missing columns to public.orders table for delivery address, dining option, client details and payment method
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS dining_option TEXT DEFAULT 'sur_place',
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS client_phone TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'wave';
