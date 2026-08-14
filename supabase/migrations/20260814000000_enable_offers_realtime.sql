-- Enable Realtime publication on public.offers table for instant proposal status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;

-- Enable REPLICA IDENTITY FULL on public.offers table so UPDATE events transmit all columns for agent_id filtering
ALTER TABLE public.offers REPLICA IDENTITY FULL;
