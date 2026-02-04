-- Fix collaborative_plans column types to match backend model
-- The backend uses String for has_plan and current_stage for flexibility

-- Change has_plan from BOOLEAN to TEXT
ALTER TABLE public.collaborative_plans
    ALTER COLUMN has_plan TYPE TEXT USING CASE WHEN has_plan THEN 'true' ELSE 'false' END;

ALTER TABLE public.collaborative_plans
    ALTER COLUMN has_plan SET DEFAULT 'true';

-- Change current_stage from INTEGER to TEXT
ALTER TABLE public.collaborative_plans
    ALTER COLUMN current_stage TYPE TEXT USING current_stage::TEXT;

ALTER TABLE public.collaborative_plans
    ALTER COLUMN current_stage SET DEFAULT '0';
