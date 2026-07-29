-- Migration to add category column to public.restaurants table
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'restaurant';
