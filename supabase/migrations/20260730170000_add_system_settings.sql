-- ==============================================================================
-- BRICK DEAL - SYSTEM SETTINGS TABLE (PARAMÈTRES GÉNÉRAUX)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active RLS sur system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Lecture et écriture universelles pour les paramètres généraux
DROP POLICY IF EXISTS "Enable read access for all system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Enable write access for all system_settings" ON public.system_settings;

CREATE POLICY "Enable read access for all system_settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Enable write access for all system_settings" ON public.system_settings FOR ALL USING (true);

-- Insertion des valeurs par défaut
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('default_commission_rate', '10', 'Taux de commission par défaut (%) appliqué sur les nouvelles offres'),
    ('app_name', 'BRICK DEAL', 'Nom officiel de la plateforme'),
    ('contact_email', 'contact@brickdeal.ci', 'Email officiel de support client')
ON CONFLICT (key) DO NOTHING;
