-- Enable Supabase Realtime for collaborative_plans table
-- This allows real-time sync between collaborators

-- Enable realtime for the collaborative_plans table
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaborative_plans;

-- Note: Realtime will respect RLS policies, so users will only receive
-- updates for plans they are members of
