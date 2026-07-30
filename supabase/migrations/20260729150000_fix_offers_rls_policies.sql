-- ==============================================================================
-- BRICK DEAL - DEBLOCAGE DEFINITIF DE LA TABLE OFFERS (FIX RLS CODE 42501 & DELETE)
-- Ce script supprime les blocages RLS sur la table offers pour permettre
-- l'insertion, la modification, la lecture et la SUPPRESSION des propositions.
-- ==============================================================================

-- 1. Nettoyage de TOUTES les anciennes politiques restrictives sur public.offers
DROP POLICY IF EXISTS "Allow anyone to view published offers" ON public.offers;
DROP POLICY IF EXISTS "Allow admins to manage all offers" ON public.offers;
DROP POLICY IF EXISTS "Allow creator agents to view and edit their pending/rejected offers" ON public.offers;
DROP POLICY IF EXISTS "Allow creator agents to view their offers" ON public.offers;
DROP POLICY IF EXISTS "Allow creator agents to insert offers" ON public.offers;
DROP POLICY IF EXISTS "Allow creator agents to view their own offers" ON public.offers;
DROP POLICY IF EXISTS "Allow agents to view their own offers" ON public.offers;
DROP POLICY IF EXISTS "Allow agents to insert offers" ON public.offers;
DROP POLICY IF EXISTS "Allow agents to update their pending offers" ON public.offers;
DROP POLICY IF EXISTS "Allow restaurant owners to view and confirm their offers" ON public.offers;
DROP POLICY IF EXISTS "Allow restaurant owners to select their offers" ON public.offers;
DROP POLICY IF EXISTS "Allow restaurant owners to view their offers" ON public.offers;
DROP POLICY IF EXISTS "Allow authenticated users to read all offers" ON public.offers;
DROP POLICY IF EXISTS "Allow authenticated users to insert offers" ON public.offers;
DROP POLICY IF EXISTS "Allow authenticated users to update offers" ON public.offers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.offers;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.offers;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.offers;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.offers;

-- 2. Activer RLS sur public.offers avec des règles permissives universelles
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- 3. Accès en LECTURE pour TOUS
CREATE POLICY "Enable read access for all users"
  ON public.offers FOR SELECT
  USING (true);

-- 4. Accès en INSERTION pour TOUS
CREATE POLICY "Enable insert access for all users"
  ON public.offers FOR INSERT
  WITH CHECK (true);

-- 5. Accès en MODIFICATION pour TOUS
CREATE POLICY "Enable update access for all users"
  ON public.offers FOR UPDATE
  USING (true);

-- 6. Accès en SUPPRESSION pour TOUS
CREATE POLICY "Enable delete access for all users"
  ON public.offers FOR DELETE
  USING (true);

-- 7. Assurer is_confirmed = true sur toutes les offres
UPDATE public.offers SET is_confirmed = true WHERE is_confirmed IS NULL OR is_confirmed = false;
