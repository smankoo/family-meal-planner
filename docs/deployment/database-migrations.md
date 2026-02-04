# Database Migration Strategy

## Overview

Database migrations are automatically applied during deployment on Render. This ensures the database schema stays in sync with the application code across all environments.

## How It Works

### Automated Migration Flow

```
1. Git push to master
2. Render detects change
3. Build starts
   ├─ Install dependencies (uv sync)
   └─ Run migrations (scripts/migrate.sh)
4. Migrations applied to database
5. Application starts
```

### Migration Script

Location: `scripts/migrate.sh`

The script:
- Installs Supabase CLI if needed
- Detects migration files in `supabase/migrations/`
- Applies pending migrations using `supabase db push`
- Exits gracefully if no migrations needed

### Deployment Configuration

**QA Environment** (`render.yaml`):
```yaml
buildCommand: "cd backend && uv sync && cd .. && bash scripts/migrate.sh"
```

**Production Environment** (`render.yaml`):
```yaml
buildCommand: "cd backend && uv sync && cd .. && bash scripts/migrate.sh"
```

## Migration Best Practices

### 1. Forward-Only Migrations

**Always write migrations that are backward-compatible:**

❌ **Bad** - Breaking change:
```sql
ALTER TABLE users DROP COLUMN email;
```

✅ **Good** - Backward-compatible:
```sql
-- Step 1: Add new column (deploy this first)
ALTER TABLE users ADD COLUMN email_new TEXT;

-- Step 2: Migrate data (run after deploy)
UPDATE users SET email_new = email WHERE email_new IS NULL;

-- Step 3: Drop old column (deploy later, after confirming)
-- ALTER TABLE users DROP COLUMN email;
```

### 2. Idempotent Migrations

Use `IF NOT EXISTS` and `IF EXISTS` to make migrations safe to run multiple times:

```sql
CREATE TABLE IF NOT EXISTS users (...);
ALTER TABLE users ADD COLUMN IF NOT EXISTS new_field TEXT;
DROP TABLE IF EXISTS old_table;
```

### 3. Migration Naming Convention

Format: `YYYYMMDDHHMMSS_description.sql`

Example: `20260204000001_add_collaborative_plans.sql`

This ensures migrations run in chronological order.

### 4. Test Migrations Locally First

```bash
# Start local Supabase
cd supabase
supabase start

# Apply migration locally
supabase db push

# Test your application
cd ..
./scripts/dev.sh

# If issues, fix and reset
supabase db reset
```

## Rollback Strategy

### Option 1: Forward Fix (Recommended)

Instead of rolling back, write a new migration to fix the issue:

```sql
-- If migration 003 broke something, create 004 to fix it
-- supabase/migrations/20260204000004_fix_issue_from_003.sql
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
```

**Advantages:**
- Maintains migration history
- Works with continuous deployment
- No data loss risk

### Option 2: Revert Deployment

If a deployment causes critical issues:

1. **Revert to previous commit in Render:**
   - Go to Render Dashboard → Service → Deploys
   - Click "Rollback" on previous working deploy
   - This redeploys old code but **doesn't undo migrations**

2. **Manually revert database changes:**
   ```bash
   # Connect to database
   psql $DATABASE_URL

   # Manually undo the migration
   DROP TABLE IF EXISTS new_table;
   ALTER TABLE users DROP COLUMN new_column;
   ```

3. **Create compensating migration:**
   ```sql
   -- supabase/migrations/20260204000005_revert_003.sql
   DROP TABLE IF EXISTS new_table;
   ```

### Option 3: Point-in-Time Recovery (Last Resort)

For catastrophic failures, use Supabase's point-in-time recovery:

1. Go to Supabase Dashboard → Database → Backups
2. Select restore point (before bad migration)
3. Restore database
4. Redeploy application with fixed migration

**Warning:** This loses all data changes after the restore point.

## Handling Schema Drift

### Scenario: QA and Prod Out of Sync

If QA has migrations that prod doesn't:

```bash
# Check migration status
psql $DATABASE_URL_QA -c "SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;"
psql $DATABASE_URL_PROD -c "SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;"

# Migrations will auto-apply on next deployment
# Or manually apply:
./scripts/migrate.sh
```

### Scenario: Manual Database Changes

If someone made manual changes to the database:

1. **Generate migration from current state:**
   ```bash
   supabase db diff --schema public > supabase/migrations/$(date +%Y%m%d%H%M%S)_capture_manual_changes.sql
   ```

2. **Review and commit:**
   ```bash
   git add supabase/migrations/
   git commit -m "chore: capture manual database changes"
   git push
   ```

## Environment-Specific Migrations

### Development (Local)

```bash
# Create new migration
supabase migration new add_feature_x

# Edit the migration file
vim supabase/migrations/YYYYMMDDHHMMSS_add_feature_x.sql

# Apply locally
supabase db push

# Test
./scripts/dev.sh
```

### QA (Automatic)

```bash
# Push to master
git push origin master

# Render auto-deploys and runs migrations
# Check logs: Render Dashboard → Service → Logs
```

### Production (Manual)

```bash
# Trigger manual deploy in Render Dashboard
# Or use Render API:
curl -X POST https://api.render.com/v1/services/srv-xxx/deploys \
  -H "Authorization: Bearer $RENDER_API_KEY"
```

## Monitoring Migrations

### Check Migration Status

```bash
# Via psql
psql $DATABASE_URL -c "SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;"

# Via Supabase Dashboard
# Go to: Database → Migrations
```

### View Migration Logs

**Render Dashboard:**
1. Go to Service → Logs
2. Filter for "migration" or "supabase"
3. Look for:
   - `Found X migration file(s)`
   - `Applying migrations to database...`
   - `✓ Migrations applied successfully!`

### Common Issues

**Issue: Migration fails during build**
```
Error: relation "table_name" already exists
```

**Solution:** Make migration idempotent:
```sql
CREATE TABLE IF NOT EXISTS table_name (...);
```

---

**Issue: Supabase CLI not found**
```
Error: supabase: command not found
```

**Solution:** Script auto-installs CLI. Check build logs for download errors.

---

**Issue: DATABASE_URL not set**
```
ERROR: DATABASE_URL not set
```

**Solution:** Set in Render Dashboard → Service → Environment → Add Environment Variable

## Migration Checklist

Before deploying a migration:

- [ ] Migration is idempotent (uses IF EXISTS/IF NOT EXISTS)
- [ ] Migration is backward-compatible with current code
- [ ] Migration tested locally with `supabase db push`
- [ ] Application tested with new schema
- [ ] Migration file follows naming convention
- [ ] Migration committed to git
- [ ] QA deployment successful
- [ ] QA application tested
- [ ] Ready for production deployment

## Related Documentation

- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Render Build & Deploy](https://render.com/docs/deploys)
- [Deployment Guide](./DEPLOYMENT.md)
