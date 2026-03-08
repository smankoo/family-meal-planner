-- Replace single is_locked with per-tab lock columns
-- Each tab (Meals, Prep, Grocery) can be locked independently

-- Add per-tab lock columns
ALTER TABLE collaborative_plans ADD COLUMN IF NOT EXISTS is_meals_locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE collaborative_plans ADD COLUMN IF NOT EXISTS is_prep_locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE collaborative_plans ADD COLUMN IF NOT EXISTS is_grocery_locked BOOLEAN NOT NULL DEFAULT false;

-- Migrate existing lock state: if is_locked was true, lock all three tabs
UPDATE collaborative_plans
SET is_meals_locked = is_locked,
    is_prep_locked = is_locked,
    is_grocery_locked = is_locked
WHERE is_locked IS NOT NULL;

-- Drop old column
ALTER TABLE collaborative_plans DROP COLUMN IF EXISTS is_locked;
