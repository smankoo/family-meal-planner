#!/bin/bash

# Script to help retrieve Supabase credentials from the dashboard
# Run this to get the URLs you need to visit

set -e

PROJECT_REF="yirgkzecscyuxisolatu"

echo "🔑 Supabase Credentials Setup"
echo "=============================="
echo ""
echo "You need to get the following credentials from the Supabase dashboard:"
echo ""
echo "1. JWT Secret:"
echo "   URL: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api"
echo "   Look for: 'JWT Secret' under 'Project API keys'"
echo "   Copy the value and update backend/.env: SUPABASE_JWT_SECRET"
echo ""
echo "2. Database Connection String (Connection Pooling):"
echo "   URL: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database"
echo "   Look for: 'Connection string' > 'Connection pooling' tab"
echo "   Mode: Transaction"
echo "   Copy the URI and update backend/.env: DATABASE_URL"
echo ""
echo "3. Verify the migration was applied:"
echo "   URL: https://supabase.com/dashboard/project/${PROJECT_REF}/editor"
echo "   Check that 'profiles' and 'user_data' tables exist"
echo ""
echo "Once you've updated backend/.env with these values, you can start the app!"
echo ""
echo "Next steps:"
echo "  1. Update backend/.env with JWT_SECRET and DATABASE_URL"
echo "  2. Start Docker Desktop (for local development later)"
echo "  3. Run: ./scripts/dev.sh"
echo ""
