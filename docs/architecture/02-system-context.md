# System Context

## C4 Level 1: System Context Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                        External Systems                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Google     │  │   Supabase   │  │   Google     │        │
│  │   Gemini     │  │   Platform   │  │  Analytics   │        │
│  │     API      │  │              │  │              │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                  │                  │                 │
│         │ LLM Requests     │ Auth & Data      │ Events          │
│         │                  │                  │                 │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                  Family Meal Planner System                     │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                     Frontend (React)                      │ │
│  │  - Meal planning UI                                       │ │
│  │  - Chat interface                                         │ │
│  │  - User authentication                                    │ │
│  └───────────────────────┬───────────────────────────────────┘ │
│                          │                                      │
│                          │ REST API                             │
│                          ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Backend (FastAPI)                      │ │
│  │  - LLM orchestration                                      │ │
│  │  - Streaming responses                                    │ │
│  │  - Data persistence                                       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
          ▲                                          ▲
          │                                          │
          │ HTTPS                                    │ HTTPS
          │                                          │
┌─────────┴──────────┐                    ┌─────────┴──────────┐
│                    │                    │                    │
│   Desktop Users    │                    │   Mobile Users     │
│   (Web Browser)    │                    │   (Web Browser)    │
│                    │                    │                    │
└────────────────────┘                    └────────────────────┘
```

## External Interfaces

### Google Gemini API
**Purpose**: AI-powered meal plan generation
**Protocol**: HTTPS REST API
**Authentication**: API Key
**Data Flow**:
- Request: Family preferences, dietary restrictions
- Response: Structured meal plans (streaming or batch)

**Key Features**:
- Streaming responses for progressive rendering
- Structured JSON output
- Rate limiting (handled gracefully)

### Supabase Platform
**Purpose**: Authentication and data persistence
**Components**:
- **Auth**: Email/password, OAuth (Google)
- **Database**: PostgreSQL with Row Level Security
- **API**: Auto-generated REST API

**Authentication Flow**:
- JWT tokens (ES256 asymmetric signing)
- PKCE flow for OAuth
- Automatic token refresh

**Data Storage**:
- User profiles
- Meal plans and preferences
- Collaborative plans
- User-specific data (JSONB)

### Google Analytics 4
**Purpose**: Usage tracking and analytics
**Protocol**: HTTPS (Measurement Protocol)
**Data Collected**:
- Page views
- User interactions
- LLM performance metrics
- Error rates

**Privacy**:
- IP anonymization enabled
- No PII tracking
- Session-based analytics

## User Interactions

### Desktop Users
- Access via web browser (Chrome, Safari, Firefox, Edge)
- Full-featured experience with hover states
- Keyboard shortcuts and navigation
- Larger screen real estate for meal grid

### Mobile Users
- Access via mobile web browser
- Touch-optimized interface
- Responsive layouts
- Swipe gestures for navigation

## Business Context

### User Needs
1. **Quick Meal Planning**: Generate 7-day meal plans in seconds
2. **Personalization**: Respect dietary restrictions and preferences
3. **Flexibility**: Modify plans via natural language
4. **Organization**: Prep schedules and grocery lists
5. **Collaboration**: Share plans with family members

### Business Goals
1. **User Engagement**: High retention through delightful UX
2. **Scalability**: Support growing user base cost-effectively
3. **Reliability**: 99.9% uptime for core features
4. **Performance**: Sub-3-second time-to-first-content

## Technical Context

### Development Environments

| Environment | Purpose | Auto-Deploy | Database |
|-------------|---------|-------------|----------|
| **Local** | Development | N/A | Docker Supabase |
| **QA** | Testing | ✅ Yes (on push to master) | QA Supabase |
| **Production** | Live users | ❌ Manual only | Prod Supabase |

### Deployment Architecture
- **Frontend**: Static site on Render.com
- **Backend**: Web service on Render.com
- **Database**: Managed PostgreSQL on Supabase
- **CDN**: Render's global CDN for static assets

### Constraints
- **Cost**: Free tier for development, $25-50/month for production
- **Latency**: Must support users globally
- **Compliance**: GDPR-ready (RLS, data export)
- **Scalability**: Serverless architecture for auto-scaling
