-- Create custom types (enums)
CREATE TYPE user_role AS ENUM ('admin', 'agent', 'restaurant', 'client');
CREATE TYPE offer_type AS ENUM ('flash', 'deal');
CREATE TYPE offer_status AS ENUM ('en_attente', 'validee', 'refusee', 'a_modifier');
CREATE TYPE pack_type AS ENUM ('couple', 'famille', 'anniversaire', 'vip', 'business', 'autre');
CREATE TYPE order_status AS ENUM ('nouvelle', 'en_preparation', 'prete', 'terminee', 'livree');
CREATE TYPE delivery_mode AS ENUM ('retrait', 'livraison');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');

-- 1. Profiles Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'client',
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    restaurant_id UUID, -- Set if role is 'restaurant'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Restaurants Table
CREATE TABLE public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50) NOT NULL,
    hours JSONB NOT NULL DEFAULT '{}'::jsonb,
    photos TEXT[] DEFAULT '{}'::text[],
    description TEXT,
    agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Assigned agent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add foreign key constraint to profiles pointing to restaurants
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_restaurant_id FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE SET NULL;

-- 3. Offers Table (Brick Flash and Brick Deal)
CREATE TABLE public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
    type public.offer_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    photos TEXT[] DEFAULT '{}'::text[],
    observation TEXT, -- Agent notes
    status public.offer_status NOT NULL DEFAULT 'en_attente',
    is_confirmed BOOLEAN NOT NULL DEFAULT false, -- Confirmed by restaurant
    is_published BOOLEAN GENERATED ALWAYS AS (status = 'validee' AND is_confirmed = true) STORED,
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00, -- e.g. 10.00%
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Brick Flash columns
    price_normal DECIMAL(12,2),
    price_promo DECIMAL(12,2),
    quantity_initial INTEGER,
    quantity_remaining INTEGER,
    start_timestamp TIMESTAMP WITH TIME ZONE,
    end_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Brick Deal columns
    pack_type public.pack_type,
    price DECIMAL(12,2),
    capacity_persons INTEGER,
    available_date DATE,
    available_time TIME
);

-- 4. Orders Table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    offer_id UUID REFERENCES public.offers(id) ON DELETE CASCADE NOT NULL,
    agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
    status public.order_status NOT NULL DEFAULT 'nouvelle',
    delivery_mode public.delivery_mode NOT NULL DEFAULT 'retrait',
    quantity INTEGER NOT NULL DEFAULT 1,
    total_amount DECIMAL(12,2) NOT NULL,
    commission_amount DECIMAL(12,2) NOT NULL,
    payment_status public.payment_status NOT NULL DEFAULT 'paid', -- default to paid as client pays in advance
    payment_ref VARCHAR(255),
    reservation_code VARCHAR(100) UNIQUE NOT NULL, -- QR code representation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Order History Table (Audit Log)
CREATE TABLE public.order_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'creee', 'acceptee', 'en_preparation', 'prete', 'terminee', 'livree'
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_restaurants_agent_id ON public.restaurants(agent_id);
CREATE INDEX idx_offers_status_published ON public.offers(is_published);
CREATE INDEX idx_offers_restaurant_id ON public.offers(restaurant_id);
CREATE INDEX idx_orders_client_id ON public.orders(client_id);
CREATE INDEX idx_orders_restaurant_id ON public.orders(restaurant_id);
CREATE INDEX idx_orders_offer_id ON public.orders(offer_id);
CREATE INDEX idx_order_history_order_id ON public.order_history(order_id);

---------------------------------------------------------
-- TRANSACTION-SAFE FLASH DEALS RESERVATION INVENTORY --
---------------------------------------------------------
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
    -- Get and lock the offer row for editing to prevent race conditions
    SELECT type, status, is_confirmed, quantity_remaining, start_timestamp, end_timestamp
    INTO v_offer_type, v_status, v_is_confirmed, v_qty_remaining, v_start_time, v_end_time
    FROM public.offers
    WHERE id = NEW.offer_id
    FOR UPDATE;

    IF v_offer_type = 'flash' THEN
        -- Verify validity
        IF v_status != 'validee' OR v_is_confirmed = false THEN
            RAISE EXCEPTION 'Offer is not active or published.';
        END IF;

        IF now() < v_start_time OR now() > v_end_time THEN
            RAISE EXCEPTION 'Offer has either not started yet or expired.';
        END IF;

        -- Verify stock
        IF v_qty_remaining < NEW.quantity THEN
            RAISE EXCEPTION 'Insufficient stock. Only % items left.', v_qty_remaining;
        END IF;

        -- Decrement stock
        UPDATE public.offers
        SET quantity_remaining = quantity_remaining - NEW.quantity
        WHERE id = NEW.offer_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_and_decrement_flash_stock
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.check_and_decrement_flash_stock();

-----------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES ---
-----------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Allow users to read their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Allow admins to manage all profiles"
    ON public.profiles FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Allow agents to view profiles"
    ON public.profiles FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'agent'));

-- Restaurants Policies
CREATE POLICY "Allow anyone to read restaurants"
    ON public.restaurants FOR SELECT
    USING (true);

CREATE POLICY "Allow admins to manage all restaurants"
    ON public.restaurants FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Allow assigned agents to update restaurants"
    ON public.restaurants FOR UPDATE
    USING (agent_id = auth.uid());

CREATE POLICY "Allow restaurant staff to view their restaurant"
    ON public.restaurants FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND restaurant_id = public.restaurants.id));

-- Offers Policies
CREATE POLICY "Allow anyone to view published offers"
    ON public.offers FOR SELECT
    USING (is_published = true);

CREATE POLICY "Allow admins to manage all offers"
    ON public.offers FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Allow creator agents to view and edit their pending/rejected offers"
    ON public.offers FOR ALL
    USING (agent_id = auth.uid() AND status IN ('en_attente', 'a_modifier'));

CREATE POLICY "Allow restaurant owners to view and confirm their offers"
    ON public.offers FOR UPDATE
    USING (restaurant_id = (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow restaurant owners to select their offers"
    ON public.offers FOR SELECT
    USING (restaurant_id = (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()));

-- Orders Policies
CREATE POLICY "Allow clients to view their own orders"
    ON public.orders FOR SELECT
    USING (client_id = auth.uid());

CREATE POLICY "Allow clients to insert orders"
    ON public.orders FOR INSERT
    WITH CHECK (client_id = auth.uid());

CREATE POLICY "Allow admins to view and manage all orders"
    ON public.orders FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Allow restaurants to view and update their orders"
    ON public.orders FOR ALL
    USING (restaurant_id = (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow agents to view orders for their restaurants"
    ON public.orders FOR SELECT
    USING (agent_id = auth.uid() OR restaurant_id IN (SELECT id FROM public.restaurants WHERE agent_id = auth.uid()));

-- Order History Policies
CREATE POLICY "Allow users to view history of their orders"
    ON public.order_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = order_history.order_id 
              AND (client_id = auth.uid() 
                   OR restaurant_id = (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid())
                   OR agent_id = auth.uid()
                   OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
        )
    );

CREATE POLICY "Allow order state updates to insert into history"
    ON public.order_history FOR INSERT
    WITH CHECK (auth.uid() = actor_id);
