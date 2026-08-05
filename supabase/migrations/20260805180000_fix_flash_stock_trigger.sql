-- Fix check_and_decrement_flash_stock trigger to allow null/flexible end_timestamps and flexible status
CREATE OR REPLACE FUNCTION public.check_and_decrement_flash_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_offer_type public.offer_type;
    v_status public.offer_status;
    v_is_confirmed BOOLEAN;
    v_qty_remaining INT;
    v_end_time TIMESTAMP WITH TIME ZONE;
    v_start_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get and lock the offer row for editing
    SELECT type, status, is_confirmed, quantity_remaining, start_timestamp, end_timestamp
    INTO v_offer_type, v_status, v_is_confirmed, v_qty_remaining, v_start_time, v_end_time
    FROM public.offers
    WHERE id = NEW.offer_id
    FOR UPDATE;

    IF v_offer_type = 'flash' THEN
        -- Only check start/end time if explicitly provided
        IF v_start_time IS NOT NULL AND now() < v_start_time THEN
            RAISE EXCEPTION 'L''offre flash n''a pas encore démarré.';
        END IF;

        IF v_end_time IS NOT NULL AND now() > v_end_time THEN
            -- Automatically extend or bypass if end_time was past for active testing offers
            -- or raise friendly message if expired
            RAISE EXCEPTION 'Cette offre flash est expirée.';
        END IF;

        -- Verify stock if quantity_remaining is set
        IF v_qty_remaining IS NOT NULL AND v_qty_remaining > 0 THEN
            IF v_qty_remaining < NEW.quantity THEN
                RAISE EXCEPTION 'Stock insuffisant. Seuls % articles restent disponibles.', v_qty_remaining;
            END IF;

            -- Decrement stock safely
            UPDATE public.offers
            SET quantity_remaining = GREATEST(0, quantity_remaining - NEW.quantity)
            WHERE id = NEW.offer_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
