-- Add is_locked column to collaborative_plans table
-- This allows plans to be locked to prevent accidental changes

ALTER TABLE public.collaborative_plans
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

-- Add index for better query performance when filtering by lock status
CREATE INDEX IF NOT EXISTS idx_collaborative_plans_is_locked
ON public.collaborative_plans(is_locked);
