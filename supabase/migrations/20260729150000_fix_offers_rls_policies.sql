-- ==============================================================================
-- BRICK DEAL - UNLIMITED ACCESS RLS MIGRATION FOR OFFERS & PROPOSALS
-- Permet à TOUS les utilisateurs connectés (Agents, Admins, Restaurateurs)
-- d'insérer, lire et mettre à jour toutes les propositions sans restriction RLS.
-- ==============================================================================

-- 1. Nettoyage de TOUTES les anciennes politiques sur public.offers
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

-- 2. Activer RLS sur public.offers
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- 3. Politique 1 : Tout utilisateur connecté peut LIRE TOUTES les offres
CREATE POLICY "Allow authenticated users to read all offers"
  ON public.offers FOR SELECT
  TO authenticated
  USING (true);

-- 4. Politique 2 : Tout le monde (y compris visiteurs anonymes) peut voir les offres validées
CREATE POLICY "Allow anyone to view published offers"
  ON public.offers FOR SELECT
  TO anon
  USING (status = 'validee');

-- 5. Politique 3 : Tout utilisateur connecté peut INSÉRER une proposition d'offre
CREATE POLICY "Allow authenticated users to insert offers"
  ON public.offers FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 6. Politique 4 : Tout utilisateur connecté peut MODIFIER des offres
CREATE POLICY "Allow authenticated users to update offers"
  ON public.offers FOR UPDATE
  TO authenticated
  USING (true);

-- 7. Assure que toutes les offres ont is_confirmed = true
UPDATE public.offers SET is_confirmed = true WHERE is_confirmed IS NULL OR is_confirmed = false;
