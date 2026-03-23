<div align="center">
  <h1>Family Meal Planner</h1>
  <p>
    AI-powered weekly meal planning for families — built with streaming-first architecture for a fast, delightful experience.
  </p>

  <p>
    <a href="#-quick-start">Quick Start</a> &nbsp;&bull;&nbsp;
    <a href="#-features">Features</a> &nbsp;&bull;&nbsp;
    <a href="#-architecture">Architecture</a> &nbsp;&bull;&nbsp;
    <a href="#-documentation">Documentation</a>
  </p>
</div>

---

## Overview

Family Meal Planner generates personalized 7-day meal plans, prep schedules, and grocery lists through natural language conversation with Google Gemini. Families can collaborate in real-time — when one member updates the plan, everyone sees it instantly.

The app is designed around a streaming-first philosophy: meals appear on screen within 2–3 seconds as the AI generates them, rather than making users wait 15–20 seconds for a batch response.

## ✨ Features

- **AI Meal Planning** — Generate a full week of meals tailored to your family's size, dietary needs, and cuisine preferences
- **Streaming Responses** — Meals, prep tasks, and grocery items stream in progressively via SSE
- **Real-Time Collaboration** — Share plans with family members; changes sync instantly via Supabase Broadcast
- **Multi-Stage Workflow** — Family Setup → Meal Plan → Prep Schedule → Grocery List, with per-tab locking
- **Chat Interface** — Modify your plan conversationally ("swap Monday dinner for something vegetarian")
- **Single-Meal Replacement** — Swap out individual meals without regenerating the whole plan
- **Print-Ready Views** — Printable layouts for meal plans, prep schedules, and grocery lists
- **Cloud Persistence** — All data stored in Supabase; works seamlessly across devices
- **Authentication** — Email/password and Google OAuth via Supabase Auth
- **Responsive Design** — Mobile-first, desktop-enhanced; fully usable on any screen size
- **Dark Mode** — Theme toggle with centralized CSS variable system
- **Analytics** — Google Analytics 4 integration with privacy-first defaults

## 🏗 Architecture

```
┌──────────────────┐     SSE / REST      ┌──────────────────┐     Streaming     ┌──────────────┐
│                  │ ◄─────────────────► │                  │ ◄──────────────► │              │
│   React 19 SPA   │                     │  FastAPI Backend  │                  │ Google Gemini│
│   Vite + TS      │                     │  Python 3.11+     │                  │     API      │
│   Tailwind CSS   │                     │  Async-first      │                  │              │
│                  │                     │                  │                  │              │
└────────┬─────────┘                     └────────┬─────────┘                  └──────────────┘
         │                                        │
         │  Auth + Realtime                       │  PostgreSQL
         ▼                                        ▼
┌─────────────────────────────────────────────────────────────┐
│                     Supabase Platform                       │
│  Auth (JWT/OAuth)  ·  PostgreSQL + RLS  ·  Broadcast        │
└─────────────────────────────────────────────────────────────┘
```


### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | FastAPI, Python 3.11+, Pydantic |
| Database | PostgreSQL via Supabase (with Row Level Security) |
| AI/LLM | Google Gemini API (streaming) |
| Auth | Supabase Auth (email/password, Google OAuth) |
| Real-Time | Supabase Broadcast (optimistic updates + polling fallback) |
| Analytics | Google Analytics 4 |
| Hosting | Render.com (QA auto-deploy, production manual) |
| Icons | [Phosphor Icons](https://phosphoricons.com/) |

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) — for local Supabase
- [Supabase CLI](https://supabase.com/docs/guides/cli) — `brew install supabase/tap/supabase`
- [Node.js](https://nodejs.org/) (v18+)
- [Python 3.11+](https://www.python.org/) with [uv](https://docs.astral.sh/uv/) — `curl -LsSf https://astral.sh/uv/install.sh | sh`
- A [Google Gemini API key](https://ai.google.dev/)

### 1. Clone and install

```bash
git clone <repo-url>
cd family-meal-planner

# Frontend dependencies
npm install

# Backend dependencies
cd backend && uv sync && cd ..
```

### 2. Start local Supabase

```bash
cd supabase
supabase start    # First run downloads images (~2-3 min)
supabase db reset  # Apply migrations
```

Save the `anon key` from the output — you'll need it next.

### 3. Configure environment

```bash
# Frontend
cp .env.example .env.local
# Set VITE_SUPABASE_ANON_KEY to the anon key from step 2

# Backend
cp backend/.env.example backend/.env
# Set GEMINI_API_KEY to your Google Gemini key
```

### 4. Start development

```bash
./scripts/dev.sh
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Supabase Studio | http://127.0.0.1:54323 |

### 5. Stop

```bash
./scripts/stop.sh
```

## 📁 Project Structure

```
├── frontend/               # React SPA
│   ├── components/         # UI components
│   ├── contexts/           # Auth, Theme, Toast providers
│   ├── hooks/              # Custom hooks (usePersistedState, useFamilyPlan, etc.)
│   ├── services/           # API, data, Gemini, analytics services
│   ├── config/             # Supabase & analytics config
│   ├── utils/              # Helpers (localStorage, mealResolver, privacy)
│   ├── App.tsx             # Main application component
│   ├── types.ts            # TypeScript type definitions
│   └── constants.ts        # App-wide constants
├── backend/                # FastAPI server
│   ├── routers/            # API route modules
│   ├── models.py           # SQLAlchemy models
│   ├── schemas.py          # Pydantic request/response schemas
│   ├── auth.py             # JWT validation
│   ├── database.py         # DB connection & session management
│   ├── realtime_broadcast.py # Supabase Broadcast integration
│   ├── main.py             # App entry point & LLM endpoints
│   └── alembic/            # Database migrations
├── supabase/               # Local Supabase config & migrations
├── scripts/                # Dev, start, stop, health-check scripts
├── docs/                   # Architecture (Arc42 + C4), feature docs, setup guides
└── render.yaml             # Render.com deployment blueprint
```

## 🛠 Available Scripts

| Command | Description |
|---------|-------------|
| `./scripts/dev.sh` | Start frontend + backend in dev mode |
| `./scripts/stop.sh` | Gracefully stop all services |
| `./scripts/start.sh` | Start services (production-like) |
| `./scripts/health-check.sh` | Check service health |
| `./scripts/status.sh` | Quick status overview |
| `npm run dev` | Frontend only (Vite dev server) |
| `npm run build` | Production frontend build |

## 🌍 Environments

| Environment | Database | Deploy | URL |
|-------------|----------|--------|-----|
| Local | Docker Supabase | N/A | `localhost:3000` |
| QA | Separate Supabase project | Auto on push to `master` | Render QA URLs |
| Production | Production Supabase project | Manual only | Custom domain |

QA and production are deployed on [Render.com](https://render.com) via the `render.yaml` blueprint. QA auto-deploys on every push; production requires manual promotion after QA validation.

## 📚 Documentation

Comprehensive docs live in the [`docs/`](docs/) directory:

| Section | Contents |
|---------|----------|
| [Architecture](docs/architecture/) | Arc42 + C4 system documentation (9 chapters) |
| [Features](docs/features/) | Authentication, data persistence, streaming LLM, family plans |
| [Setup](docs/setup/) | Environment setup, OAuth config, Supabase quickstart |
| [Deployment](docs/deployment/) | QA/production deployment guide, database migrations |
| [Design Language](docs/DESIGN_LANGUAGE.md) | Visual design system, component patterns, theme tokens |

## 🔒 Security

- JWT-based authentication with ES256 asymmetric signing
- Row Level Security (RLS) on all database tables
- PKCE flow for OAuth
- Pre-commit hooks to prevent secret leaks (detect-secrets)
- Environment-separated credentials (never committed to git)
- CORS restricted to known origins

See [docs/SECURITY.md](docs/SECURITY.md) for the full security overview.

## 🤝 Contributing

1. Develop against local Supabase — never connect to production
2. Follow the [Design Language](docs/DESIGN_LANGUAGE.md) for any UI changes
3. All styles go through the centralized theme system (no hardcoded values)
4. Keep operations async and fault-tolerant
5. Test in QA before promoting to production
