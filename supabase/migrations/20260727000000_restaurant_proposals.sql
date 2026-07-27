-- Drop NOT NULL constraints to allow direct restaurant submissions without an agent
ALTER TABLE public.offers ALTER COLUMN agent_id DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN agent_id DROP NOT NULL;

-- RLS policies to allow restaurant owners to submit and manage their own proposals
CREATE POLICY "Allow restaurant owners to insert their offers"
    ON public.offers FOR INSERT
    WITH CHECK (restaurant_id = (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow restaurant owners to delete their pending offers"
    ON public.offers FOR DELETE
    USING (restaurant_id = (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()) AND status IN ('en_attente', 'a_modifier'));
