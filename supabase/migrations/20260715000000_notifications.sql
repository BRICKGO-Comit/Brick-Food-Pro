-- Notifications table for real-time alerts to restaurants, agents, and admins
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info', -- 'new_order', 'status_update', 'info'
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for fast lookup
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_order_id ON public.notifications(order_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Each user can only read their own notifications
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Each user can update (mark as read) their own notifications
CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Admins can view all notifications
CREATE POLICY "Admins can manage all notifications"
    ON public.notifications FOR ALL
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Authenticated users can insert notifications (needed for order creation flow)
CREATE POLICY "Authenticated users can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Enable Realtime on notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Also enable Realtime on orders table for live tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
