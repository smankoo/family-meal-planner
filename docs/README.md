# Family Meal Planner Documentation

## Overview

This directory contains comprehensive technical documentation for the Family Meal Planner application, following the Arc42 architecture template combined with C4 model diagrams.

## Documentation Structure

### Architecture Documentation (`architecture/`)

Comprehensive system architecture following Arc42 template:

1. **[Introduction](architecture/01-introduction.md)** - Overview, stakeholders, quality goals
2. **[System Context](architecture/02-system-context.md)** - External dependencies and interfaces
3. **[Solution Strategy](architecture/03-solution-strategy.md)** - Key architectural decisions
4. **[Building Blocks](architecture/04-building-blocks.md)** - Component architecture (C4 Level 2-3)
5. **[Runtime View](architecture/05-runtime-view.md)** - Key scenarios and data flows
6. **[Deployment](architecture/06-deployment.md)** - Infrastructure and deployment strategy
7. **[Cross-Cutting Concerns](architecture/07-cross-cutting-concerns.md)** - Security, performance, observability
8. **[Design Decisions](architecture/08-design-decisions.md)** - ADRs and technical debt
9. **[Quality Requirements](architecture/09-quality-requirements.md)** - Quality goals and scenarios

### Feature Documentation (`features/`)

Detailed implementation guides for key features:

- **[Authentication System](features/authentication.md)** - Supabase Auth, OAuth, JWT validation
- **[Data Persistence](features/data-persistence.md)** - Cloud-first storage, cross-device sync
- **[Streaming LLM](features/streaming-llm.md)** - Progressive rendering, SSE implementation
- **[Collaborative Plans](features/collaborative-plans.md)** - Plan sharing, real-time collaboration

## Quick Start

### For New Developers

1. Start with [Introduction](architecture/01-introduction.md) for overview
2. Read [System Context](architecture/02-system-context.md) to understand external dependencies
3. Review [Building Blocks](architecture/04-building-blocks.md) for component architecture
4. Check [Deployment](architecture/06-deployment.md) for environment setup

### For Feature Development

1. Review relevant feature documentation in `features/`
2. Check [Design Decisions](architecture/08-design-decisions.md) for context
3. Follow [Solution Strategy](architecture/03-solution-strategy.md) patterns
4. Ensure [Quality Requirements](architecture/09-quality-requirements.md) are met

### For Operations

1. Read [Deployment](architecture/06-deployment.md) for infrastructure details
2. Review [Cross-Cutting Concerns](architecture/07-cross-cutting-concerns.md) for monitoring
3. Check [Quality Requirements](architecture/09-quality-requirements.md) for SLAs

## Technology Stack

**Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
**Backend**: FastAPI (Python 3.11+) with async/streaming
**Database**: PostgreSQL via Supabase
**AI/LLM**: Google Gemini API
**Hosting**: Render.com (QA/Production), Docker (Local)
**Analytics**: Google Analytics 4

## Key Architectural Decisions

- **Streaming-First**: SSE for progressive LLM response rendering
- **Cloud-First**: Supabase as single source of truth for data
- **Async-First**: All operations are non-blocking
- **Centralized Styling**: CSS variables + Tailwind for theming
- **Multi-Environment**: Separate local, QA, and production environments

## Quality Goals

1. **Responsiveness** (Priority 1): Time-to-first-content < 3 seconds
2. **Reliability** (Priority 2): 99.9% uptime, graceful degradation
3. **Security** (Priority 3): JWT auth, RLS, no secret leaks
4. **Usability** (Priority 4): Apple-inspired UX, mobile-first
5. **Maintainability** (Priority 5): Clean architecture, comprehensive docs

## Development Workflow

### Local Development

```bash
# Start Supabase
cd supabase && supabase start

# Start backend and frontend
./scripts/dev.sh

# Access app
open http://localhost:3000
```

### QA Deployment

```bash
# Auto-deploys on push to master
git push origin master

# Access QA
open https://qa.mealplan.mankoo.ca
```

### Production Deployment

```bash
# Manual deploy via Render dashboard
# 1. Test thoroughly in QA
# 2. Go to Render dashboard
# 3. Select production service
# 4. Click "Manual Deploy"
```

## Documentation Conventions

### Code Examples

All code examples are production code from the actual application, not pseudocode.

### Diagrams

- ASCII diagrams for simple flows
- Mermaid diagrams for complex architectures (future)
- C4 model for system architecture

### File References

File paths are relative to project root:
- `backend/main.py` - Backend entry point
- `components/App.tsx` - Frontend main component
- `supabase/migrations/` - Database migrations

## Contributing to Documentation

### When to Update

- **Architecture changes**: Update relevant architecture docs
- **New features**: Add to feature documentation
- **Design decisions**: Add ADR to design-decisions.md
- **Quality changes**: Update quality-requirements.md

### Documentation Standards

- Use clear, concise language
- Include code examples from actual codebase
- Provide context and rationale
- Keep diagrams up-to-date
- Link related documentation

## Related Resources

### External Documentation

- [Supabase Documentation](https://supabase.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Google Gemini API](https://ai.google.dev/docs)

### Project Files

- `README.md` - Project overview and setup
- `DESIGN_LANGUAGE.md` - UI/UX design principles
- `SECURITY.md` - Security guidelines
- `DEPLOYMENT.md` - Deployment procedures

## Support

For questions or clarifications:
1. Check relevant documentation section
2. Review code examples in codebase
3. Check related documentation links
4. Consult team members

## Version History

- **v3.0.0** (2026-02-03): Cloud-first persistence, collaborative plans
- **v2.0.0** (2026-01-18): Streaming LLM implementation
- **v1.0.0** (2026-01-10): Initial release with Supabase auth

---

**Last Updated**: February 3, 2026
**Maintained By**: Development Team
