-- Migration to ensure all proposals and offers are confirmed so status = 'validee' automatically triggers is_published = true
UPDATE public.offers
SET is_confirmed = true
WHERE is_confirmed = false;

-- Default is_confirmed to true for new offers
ALTER TABLE public.offers ALTER COLUMN is_confirmed SET DEFAULT true;
