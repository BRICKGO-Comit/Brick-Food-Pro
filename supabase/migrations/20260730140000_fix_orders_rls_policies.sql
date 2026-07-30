-- ==============================================================================
-- BRICK DEAL - DEBLOCAGE DEFINITIF DE LA TABLE ORDERS & ORDER_HISTORY
-- Permet la création, la lecture et la mise à jour des réservations/commandes
-- par les clients, agents, restaurateurs et administrateurs sans blocage RLS (Fix 42501).
-- ==============================================================================

-- 1. Nettoyage des anciennes règles restrictives sur public.orders
DROP POLICY IF EXISTS "Allow clients to view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow clients to insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow admins to view and manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Allow restaurants to view and update their orders" ON public.orders;
DROP POLICY IF EXISTS "Allow agents to view orders for their restaurants" ON public.orders;
DROP POLICY IF EXISTS "Enable read access for all orders" ON public.orders;
DROP POLICY IF EXISTS "Enable insert access for all orders" ON public.orders;
DROP POLICY IF EXISTS "Enable update access for all orders" ON public.orders;
DROP POLICY IF EXISTS "Enable delete access for all orders" ON public.orders;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 2. Accès universel pour la table orders (Lecture, Insertion, Modification, Suppression)
CREATE POLICY "Enable read access for all orders"
  ON public.orders FOR SELECT
  USING (true);

CREATE POLICY "Enable insert access for all orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update access for all orders"
  ON public.orders FOR UPDATE
  USING (true);

CREATE POLICY "Enable delete access for all orders"
  ON public.orders FOR DELETE
  USING (true);

-- 3. Nettoyage et déblocage de public.order_history
DROP POLICY IF EXISTS "Allow users to view history of their orders" ON public.order_history;
DROP POLICY IF EXISTS "Allow order state updates to insert into history" ON public.order_history;
DROP POLICY IF EXISTS "Enable read access for all order_history" ON public.order_history;
DROP POLICY IF EXISTS "Enable insert access for all order_history" ON public.order_history;

ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all order_history"
  ON public.order_history FOR SELECT
  USING (true);

CREATE POLICY "Enable insert access for all order_history"
  ON public.order_history FOR INSERT
  WITH CHECK (true);
