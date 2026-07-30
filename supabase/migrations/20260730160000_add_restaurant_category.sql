-- ==============================================================================
-- BRICK DEAL - AJOUT DE LA COLONNE CATEGORY SUR PUBLIC.RESTAURANTS
-- ==============================================================================

ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'restaurant';

-- Mettre à jour les enregistrements existants nuls avec une catégorie par défaut
UPDATE public.restaurants 
SET category = 'restaurant' 
WHERE category IS NULL;
