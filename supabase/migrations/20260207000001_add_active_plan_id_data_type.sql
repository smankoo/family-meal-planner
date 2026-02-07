-- Add active_plan_id to valid data types for user_data table
-- This allows persisting the user's active family plan ID across sessions

-- Drop the existing constraint
ALTER TABLE public.user_data DROP CONSTRAINT IF EXISTS valid_data_types;

-- Add the updated constraint with active_plan_id
ALTER TABLE public.user_data ADD CONSTRAINT valid_data_types
    CHECK (data_type IN ('family', 'preferences', 'meal_plan', 'prep_tasks', 'grocery_items', 'invalidation_state', 'has_plan', 'current_stage', 'active_plan_id'));
