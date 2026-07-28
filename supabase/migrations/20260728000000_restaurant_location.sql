-- Add latitude and longitude columns to restaurants table for GPS tracking
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
