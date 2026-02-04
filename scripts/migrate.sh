#!/bin/bash
# Database migration script for automated deployments
# Runs migrations automatically on Render deployment

set -e  # Exit on error

echo "=== Database Migration Script ==="
echo "Environment: ${ENVIRONMENT:-development}"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL not set"
    exit 1
fi

echo "Database URL configured: ${DATABASE_URL:0:30}..."

# Install Supabase CLI to /tmp to avoid conflicts with supabase/ directory
SUPABASE_BIN="/tmp/supabase-cli/supabase"
if [ ! -f "$SUPABASE_BIN" ]; then
    echo "Installing Supabase CLI..."
    mkdir -p /tmp/supabase-cli
    curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz -o /tmp/supabase.tar.gz
    tar -xzf /tmp/supabase.tar.gz -C /tmp/supabase-cli
    rm /tmp/supabase.tar.gz
    chmod +x "$SUPABASE_BIN"
fi

echo "Supabase CLI version: $($SUPABASE_BIN --version)"

# Check for migrations directory
if [ ! -d "supabase/migrations" ]; then
    echo "No migrations directory found, skipping migrations"
    exit 0
fi

# Count migration files
MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
echo "Found $MIGRATION_COUNT migration file(s)"

if [ "$MIGRATION_COUNT" -eq 0 ]; then
    echo "No migrations to apply"
    exit 0
fi

# Apply migrations
echo "Applying migrations to database..."
$SUPABASE_BIN db push --db-url "$DATABASE_URL" --include-all

echo "✓ Migrations applied successfully!"
