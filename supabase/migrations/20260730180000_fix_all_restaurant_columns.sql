-- ==============================================================================
-- BRICK DEAL - AJOUT DE TOUTES LES COLONNES OPTIONNELLES SUR PUBLIC.RESTAURANTS
-- ==============================================================================

ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'restaurant';
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Met à jour la catégorie par défaut
UPDATE public.restaurants SET category = 'restaurant' WHERE category IS NULL;
