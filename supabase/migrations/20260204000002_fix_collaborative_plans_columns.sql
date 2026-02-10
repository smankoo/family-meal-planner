-- Fix collaborative_plans column types to match backend model
-- The backend uses String for has_plan and current_stage for flexibility

-- Change has_plan from BOOLEAN to TEXT (only if still boolean)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'collaborative_plans'
        AND column_name = 'has_plan' AND data_type = 'boolean'
    ) THEN
        ALTER TABLE public.collaborative_plans
            ALTER COLUMN has_plan TYPE TEXT USING CASE WHEN has_plan THEN 'true' ELSE 'false' END;
        ALTER TABLE public.collaborative_plans
            ALTER COLUMN has_plan SET DEFAULT 'true';
    END IF;
END $$;

-- Change current_stage from INTEGER to TEXT (only if still integer)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'collaborative_plans'
        AND column_name = 'current_stage' AND data_type = 'integer'
    ) THEN
        ALTER TABLE public.collaborative_plans
            ALTER COLUMN current_stage TYPE TEXT USING current_stage::TEXT;
        ALTER TABLE public.collaborative_plans
            ALTER COLUMN current_stage SET DEFAULT '0';
    END IF;
END $$;
