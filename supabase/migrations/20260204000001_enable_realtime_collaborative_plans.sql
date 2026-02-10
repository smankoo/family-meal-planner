-- Enable Supabase Realtime for collaborative_plans table
-- This allows real-time sync between collaborators

-- Enable realtime for the collaborative_plans table (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'collaborative_plans'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.collaborative_plans;
    END IF;
END $$;

-- Note: Realtime will respect RLS policies, so users will only receive
-- updates for plans they are members of
