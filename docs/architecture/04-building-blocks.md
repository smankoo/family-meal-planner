# Building Blocks View

## C4 Level 2: Container Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Family Meal Planner                         │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  Frontend Container                       │ │
│  │                  (React + TypeScript)                     │ │
│  │                                                           │ │
│  │  - Single Page Application                               │ │
│  │  - Responsive UI (mobile + desktop)                      │ │
│  │  - Real-time streaming rendering                         │ │
│  │  - Client-side routing                                   │ │
│  │                                                           │ │
│  │  Port: 3000 (dev), 443 (prod)                           │ │
│  │  Tech: React 19, Vite, Tailwind CSS                     │ │
│  └───────────────────┬───────────────────────────────────────┘ │
│                      │                                          │
│                      │ HTTPS REST API                           │
│                      │ + Server-Sent Events                     │
│                      ▼                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  Backend Container                        │ │
│  │                  (FastAPI + Python)                       │ │
│  │                                                           │ │
│  │  - RESTful API                                           │ │
│  │  - Streaming endpoints (SSE)                             │ │
│  │  - JWT authentication                                    │ │
│  │  - LLM orchestration                                     │ │
│  │                                                           │ │
│  │  Port: 8000                                              │ │
│  │  Tech: FastAPI, SQLAlchemy, Pydantic                    │ │
│  └───────────────────┬───────────────────────────────────────┘ │
│                      │                                          │
│                      │ SQL (PostgreSQL)                         │
│                      ▼                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                Database Container                         │ │
│  │                (PostgreSQL via Supabase)                  │ │
│  │                                                           │ │
│  │  - User profiles                                         │ │
│  │  - Meal plans and preferences                            │ │
│  │  - Collaborative plans                                   │ │
│  │  - Row Level Security                                    │ │
│  │                                                           │ │
│  │  Port: 5432 (direct), 6543 (pooler)                     │ │
│  │  Tech: PostgreSQL 15, Supabase                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

External Dependencies:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Google     │  │   Supabase   │  │   Google     │
│   Gemini     │  │     Auth     │  │  Analytics   │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Frontend Container

### Component Architecture

```
frontend/
├── App.tsx                    # Main application logic
├── components/
│   ├── AppWithProviders.tsx   # Context providers wrapper
│   │
│   ├── Auth & User
│   │   ├── AuthModal.tsx          # Sign in/up modal
│   │   ├── AuthCallback.tsx       # OAuth callback handler
│   │   ├── ProtectedRoute.tsx     # Route guard
│   │   ├── UserMenu.tsx           # User dropdown menu
│   │   ├── UserProfile.tsx        # Profile management
│   │   └── FamilyMemberList.tsx   # Reusable member display
│   │
│   ├── Core Features
│   │   ├── FamilySetup.tsx        # Family member configuration
│   │   ├── FamilyInviteModal.tsx  # Family invite & member display
│   │   ├── MealGrid.tsx           # 7-day meal plan display
│   │   ├── PrintableMealPlan.tsx  # Print-optimized weekly plan (single Letter sheet)
│   │   ├── ChatInterface.tsx      # LLM conversation UI
│   │   ├── MealPrepView.tsx       # Prep task management
│   │   └── GroceryListView.tsx    # Shopping list
│   │
│   ├── Shared Components
│   │   ├── StageStepper.tsx       # Multi-stage navigation
│   │   ├── FamilyInviteModal.tsx  # Plan sharing & member display
│   │   ├── ConfirmationModal.tsx  # Confirmation dialogs
│   │   ├── ErrorModal.tsx         # Error display
│   │   ├── Toast.tsx              # Notifications
│   │   ├── Footer.tsx             # App footer
│   │   ├── LoadingScreen.tsx      # Full-screen loader
│   │   ├── InvalidationBanner.tsx # Data invalidation warning
│   │   └── ErrorBoundary.tsx      # Error boundary
│   │
│   └── skeletons/
│       └── MealGridSkeleton.tsx   # Loading placeholder
```

### Service Layer

```
frontend/services/
├── apiService.ts              # Backend API client
│   ├── Authentication methods
│   ├── User data CRUD
│   └── Family plans
│
├── dataService.ts             # Data persistence
│   ├── Cloud-first storage
│   ├── Migration from localStorage
│   └── Request batching
│
├── geminiService.ts           # LLM integration
│   ├── Meal plan generation (streaming + batch)
│   ├── Plan updates via chat
│   ├── Meal replacement
│   ├── Prep task generation (full + incremental)
│   ├── Grocery list generation (full + incremental)
│   └── Shared SSE stream reader for incremental updates
│
└── analyticsService.ts        # Event tracking
    ├── Page view tracking
    ├── User interaction events
    └── LLM performance metrics
```

### State Management

```
frontend/contexts/
├── AuthContext.tsx            # User authentication state
│   ├── user: User | null
│   ├── session: Session | null
│   ├── signInWithEmail()
│   ├── signUpWithEmail()
│   ├── signOut()
│   └── resetPassword()
│
└── ToastContext.tsx           # Notification state
    └── showToast(message, type)

frontend/hooks/
├── usePersistedState.ts       # Cloud-synced state
│   ├── Loads from Supabase
│   ├── Saves to Supabase
│   └── Automatic migration
│
├── useFamilyPlan.ts           # Real-time family sync
│   ├── Supabase Broadcast subscription
│   ├── 30s poll safety net
│   ├── Debounced outbound save
│   └── Self-update filtering
│
└── useAnalytics.ts            # Analytics tracking
    ├── trackEvent()
    ├── trackMealPlanning()
    └── trackLLMInteraction()
```

### Configuration

```
frontend/config/
├── supabase.ts                # Supabase client setup
│   ├── createClient()
│   ├── Auth configuration
│   └── Type definitions
│
└── analytics.ts               # Analytics configuration
    ├── GA4 measurement ID
    ├── Debug mode settings
    └── Environment detection
```

### Type Definitions

```typescript
// frontend/types.ts - Core domain types

interface FamilyMember {
  id: string;
  name: string;
  age: number;
  role: 'Adult' | 'Child' | 'Teen';
  likes: string;
  dislikes: string;
  notes: string;
}

interface FamilyPreferences {
  cuisines: string[];
  restrictions: string[];
  weekendEffort: 'low' | 'medium' | 'high';
  generalNotes: string;
}

interface MealCell {
  name: string;
  description: string;
  notes: string;
  tags: string[];
}

interface DayPlan {
  day: string;
  meals: {
    Breakfast: MealCell;
    Lunch: MealCell;
    Snack: MealCell;
    Dinner: MealCell;
  };
}

type WeekPlan = DayPlan[];

interface PrepTask {
  id: string;
  day: string;
  task: string;
  relatedMeals: string[];
  completed: boolean;
}

interface GroceryItem {
  id: string;
  name: string;
  category: string;
  quantity: string;
  checked: boolean;
  relatedMeals?: string[];     // Meals that use this ingredient
}

interface InvalidationState {
  planVersion: number;
  prepVersion: number;
  groceryVersion: number;
  prepInvalidated: boolean;
  groceryInvalidated: boolean;
}

interface MealChange {
  day: string;
  mealType: string;
  oldMeal?: MealCell;
  newMeal: MealCell;
}
```

## Backend Container

### API Structure

```
backend/
├── main.py                    # FastAPI application
│   ├── CORS middleware
│   ├── Error handlers
│   ├── LLM endpoints
│   └── Health check
│
├── routers/
│   ├── user_data.py           # User data CRUD
│   │   ├── GET /user-data/
│   │   ├── GET /user-data/{type}
│   │   ├── PUT /user-data/{type}
│   │   └── DELETE /user-data/{type}
│   │
│   └── family_plans.py        # Family plan sharing + real-time broadcast
│       ├── POST /family-plans/
│       ├── GET /family-plans/my-plans
│       ├── GET /family-plans/by-invite-code/{code}
│       ├── POST /family-plans/join
│       ├── GET /family-plans/{id}
│       ├── PUT /family-plans/{id}          # Broadcasts via Supabase
│       ├── POST /family-plans/{id}/leave
│       └── DELETE /family-plans/{id}
│
├── realtime_broadcast.py      # Supabase Broadcast REST client
│   ├── broadcast_plan_update()
│   └── Fire-and-forget via httpx
│
├── models.py                  # SQLAlchemy models
│   ├── Profile
│   ├── UserData
│   ├── CollaborativePlan
│   └── PlanMember
│
├── schemas.py                 # Pydantic schemas
│   ├── Request models
│   └── Response models
│
├── database.py                # Database configuration
│   ├── Engine setup
│   ├── Session management
│   └── get_db() dependency
│
├── supabase_auth.py           # JWT validation
│   ├── JWKS key fetching
│   ├── Token verification
│   └── get_current_user_id()
│
└── auth.py                    # Legacy auth utilities
```

### API Endpoints

#### Meal Planning Endpoints

```python
# Batch generation
POST /api/generate-plan
POST /api/generate-prep
POST /api/generate-grocery

# Streaming generation (SSE)
POST /api/generate-plan-stream
POST /api/generate-prep-stream
POST /api/generate-grocery-stream

# Plan modifications
POST /api/update-plan          # Chat-based updates
POST /api/replace-meal         # Single meal replacement

# Incremental updates (SSE) — patches only affected tasks/items
PATCH /api/update-prep-stream     # Partial prep update after meal changes
PATCH /api/update-grocery-stream  # Partial grocery update after meal changes
```

#### User Data Endpoints

```python
GET    /user-data/             # Get all user data
GET    /user-data/{type}       # Get specific data type
PUT    /user-data/{type}       # Upsert data
DELETE /user-data/{type}       # Delete data
GET    /user-data/export/all   # Export all data
POST   /user-data/import/all   # Import data
```

#### Family Plan Endpoints

```python
POST   /family-plans/                       # Create family plan
GET    /family-plans/my-plans               # Get user's plans
GET    /family-plans/my-membership          # Get current family membership (startup source of truth)
GET    /family-plans/by-invite-code/{code}  # Get plan by invite code (with members)
POST   /family-plans/join                   # Join family (persists active_plan_id)
GET    /family-plans/{id}                   # Get plan with member profiles
PUT    /family-plans/{id}                   # Update plan + broadcast
POST   /family-plans/{id}/leave             # Leave family (clears user data)
DELETE /family-plans/{id}                   # Delete plan (owner only)
```

**Note**: All family plan endpoints now include full user profile data (name, email, avatar_url) for each plan member, enabling rich member display in the UI.

### Database Models

```python
# models.py

class Profile(Base):
    """User profile (extends auth.users)"""
    id: UUID                    # FK to auth.users
    email: str
    name: str | None
    avatar_url: str | None
    created_at: datetime
    updated_at: datetime

class UserData(Base):
    """Flexible user data storage"""
    id: UUID
    user_id: UUID               # FK to profiles
    data_type: str              # family, preferences, meal_plan, etc.
    data: dict                  # JSONB
    created_at: datetime
    updated_at: datetime

class CollaborativePlan(Base):
    """Shared meal plans"""
    id: UUID
    share_id: str               # 12-char hex
    plan_data: dict             # JSONB
    family_data: dict           # JSONB
    preferences_data: dict      # JSONB
    prep_tasks: dict            # JSONB
    grocery_items: dict         # JSONB
    invalidation_state: dict    # JSONB
    has_plan: str
    current_stage: str
    title: str
    is_meals_locked: bool       # Per-tab lock: Meals
    is_prep_locked: bool        # Per-tab lock: Prep
    is_grocery_locked: bool     # Per-tab lock: Grocery
    created_by: UUID            # FK to profiles
    last_modified_by: UUID      # FK to profiles
    created_at: datetime
    updated_at: datetime

class PlanMember(Base):
    """Plan access control"""
    id: UUID
    plan_id: UUID               # FK to collaborative_plans
    user_id: UUID               # FK to profiles
    role: str                   # owner, member
    joined_at: datetime
    last_viewed_at: datetime
```

## Database Container

### Schema Overview

```sql
-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User data (flexible JSONB storage)
CREATE TABLE user_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    data_type TEXT NOT NULL CHECK (data_type IN (
        'family', 'preferences', 'meal_plan', 'prep_tasks',
        'grocery_items', 'invalidation_state', 'has_plan', 'current_stage',
        'active_plan_id'
    )),
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, data_type)
);

-- Collaborative plans
CREATE TABLE collaborative_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id TEXT UNIQUE NOT NULL,
    plan_data JSONB,
    family_data JSONB,
    preferences_data JSONB,
    prep_tasks JSONB,
    grocery_items JSONB,
    invalidation_state JSONB,
    has_plan TEXT,
    current_stage TEXT,
    title TEXT,
    is_meals_locked BOOLEAN NOT NULL DEFAULT false,
    is_prep_locked BOOLEAN NOT NULL DEFAULT false,
    is_grocery_locked BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES profiles(id),
    last_modified_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plan members (access control)
CREATE TABLE plan_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES collaborative_plans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, user_id)
);
```

### Row Level Security (RLS)

```sql
-- Users can only access their own data
CREATE POLICY "Users can view own data"
    ON user_data FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
    ON user_data FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
    ON user_data FOR UPDATE
    USING (auth.uid() = user_id);

-- Plan members can access shared plans
CREATE POLICY "Members can view plans"
    ON collaborative_plans FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM plan_members
            WHERE plan_id = collaborative_plans.id
            AND user_id = auth.uid()
        )
    );

-- Only owners can delete plans
CREATE POLICY "Owners can delete plans"
    ON collaborative_plans FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM plan_members
            WHERE plan_id = collaborative_plans.id
            AND user_id = auth.uid()
            AND role = 'owner'
        )
    );
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_user_data_user_id ON user_data(user_id);
CREATE INDEX idx_user_data_data_type ON user_data(data_type);
CREATE INDEX idx_plan_members_plan_id ON plan_members(plan_id);
CREATE INDEX idx_plan_members_user_id ON plan_members(user_id);
CREATE INDEX idx_collaborative_plans_share_id ON collaborative_plans(share_id);
```

## Cross-Cutting Components

### Authentication Flow

```
1. User enters credentials
2. Frontend calls Supabase Auth
3. Supabase returns JWT token
4. Frontend stores token in session
5. Frontend includes token in API requests
6. Backend validates JWT using JWKS
7. Backend extracts user_id from token
8. Backend enforces RLS at database level
```

### Data Flow

```
1. User interacts with UI
2. Component updates local state
3. usePersistedState hook triggers
4. dataService.saveData() called
5. API request to backend
6. Backend validates JWT
7. Backend saves to database (RLS enforced)
8. Success response to frontend
9. UI reflects saved state
```

### Streaming Flow

```
1. User requests meal plan
2. Frontend calls streaming endpoint
3. Backend initiates SSE connection
4. Backend calls Gemini API
5. Gemini streams JSON chunks
6. Backend parses and forwards chunks
7. Frontend receives SSE events
8. Frontend parses partial JSON
9. UI updates progressively
10. Connection closes on completion
```
