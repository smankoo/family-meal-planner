-- Add collaborative meal plans functionality
-- Allows multiple users to share and edit the same meal plan in real-time

-- Create collaborative_plans table (the actual plan data)
CREATE TABLE IF NOT EXISTS public.collaborative_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id TEXT UNIQUE NOT NULL DEFAULT lower(encode(gen_random_bytes(6), 'hex')),
    plan_data JSONB NOT NULL,
    family_data JSONB,
    preferences_data JSONB,
    prep_tasks JSONB,
    grocery_items JSONB,
    invalidation_state JSONB,
    has_plan BOOLEAN DEFAULT true,
    current_stage INTEGER DEFAULT 0,
    title TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_modified_by UUID REFERENCES public.profiles(id)
);

-- Create plan_members table (who has access to which plans)
CREATE TABLE IF NOT EXISTS public.plan_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.collaborative_plans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collaborative_plans_share_id ON public.collaborative_plans(share_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_plans_created_by ON public.collaborative_plans(created_by);
CREATE INDEX IF NOT EXISTS idx_plan_members_plan_id ON public.plan_members(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_members_user_id ON public.plan_members(user_id);

-- Add triggers for updated_at (idempotent)
DROP TRIGGER IF EXISTS set_collaborative_plans_updated_at ON public.collaborative_plans;
CREATE TRIGGER set_collaborative_plans_updated_at
    BEFORE UPDATE ON public.collaborative_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.collaborative_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collaborative_plans (idempotent - drop before create)
DROP POLICY IF EXISTS "Members can view their collaborative plans" ON public.collaborative_plans;
CREATE POLICY "Members can view their collaborative plans"
    ON public.collaborative_plans FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.plan_members
            WHERE plan_members.plan_id = collaborative_plans.id
            AND plan_members.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create collaborative plans" ON public.collaborative_plans;
CREATE POLICY "Users can create collaborative plans"
    ON public.collaborative_plans FOR INSERT
    WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Members can update their collaborative plans" ON public.collaborative_plans;
CREATE POLICY "Members can update their collaborative plans"
    ON public.collaborative_plans FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.plan_members
            WHERE plan_members.plan_id = collaborative_plans.id
            AND plan_members.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Owners can delete their collaborative plans" ON public.collaborative_plans;
CREATE POLICY "Owners can delete their collaborative plans"
    ON public.collaborative_plans FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.plan_members
            WHERE plan_members.plan_id = collaborative_plans.id
            AND plan_members.user_id = auth.uid()
            AND plan_members.role = 'owner'
        )
    );

-- RLS Policies for plan_members (idempotent - drop before create)
DROP POLICY IF EXISTS "Members can view plan memberships" ON public.plan_members;
CREATE POLICY "Members can view plan memberships"
    ON public.plan_members FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.plan_members pm
            WHERE pm.plan_id = plan_members.plan_id
            AND pm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can join plans" ON public.plan_members;
CREATE POLICY "Users can join plans"
    ON public.plan_members FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their membership" ON public.plan_members;
CREATE POLICY "Users can update their membership"
    ON public.plan_members FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can remove members" ON public.plan_members;
CREATE POLICY "Owners can remove members"
    ON public.plan_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.plan_members pm
            WHERE pm.plan_id = plan_members.plan_id
            AND pm.user_id = auth.uid()
            AND pm.role = 'owner'
        )
    );
