-- ==============================================================================
-- BRICK DEAL - FIX OFFERS RLS POLICIES & PERMISSIONS
-- Permet aux agents de voir toutes leurs offres (en attente, validées, refusées),
-- permet aux administrateurs de lire et modifier toutes les offres,
-- et permet au public de lire toutes les offres validées.
-- ==============================================================================

-- 1. Nettoyage des anciennes politiques sur public.offers
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

-- 2. Politique 1 : Tout le monde (clients et public) peut voir les offres validées
CREATE POLICY "Allow anyone to view published offers"
  ON public.offers FOR SELECT
  USING (status = 'validee');

-- 3. Politique 2 : Les administrateurs ont un accès total (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Allow admins to manage all offers"
  ON public.offers FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Politique 3 : Les agents commerciaux peuvent VOIR toutes leurs offres (en attente, validée, refusée)
CREATE POLICY "Allow agents to view their own offers"
  ON public.offers FOR SELECT
  USING (agent_id = auth.uid());

-- 5. Politique 4 : Les agents commerciaux peuvent CRÉER des offres (INSERT)
CREATE POLICY "Allow agents to insert offers"
  ON public.offers FOR INSERT
  WITH CHECK (agent_id = auth.uid() OR auth.uid() IS NOT NULL);

-- 6. Politique 5 : Les agents commerciaux peuvent MODIFIER leurs offres en attente
CREATE POLICY "Allow agents to update their pending offers"
  ON public.offers FOR UPDATE
  USING (agent_id = auth.uid() AND status IN ('en_attente', 'a_modifier'));

-- 7. Politique 6 : Les restaurateurs peuvent voir leurs offres
CREATE POLICY "Allow restaurant owners to view their offers"
  ON public.offers FOR SELECT
  USING (restaurant_id = (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()));

-- 8. Assure que toutes les offres existantes sont confirmed
UPDATE public.offers SET is_confirmed = true WHERE is_confirmed IS NULL OR is_confirmed = false;
