#!/bin/bash

# Supabase Infrastructure as Code Setup Script
# This script automates the creation and configuration of Supabase environments

set -e  # Exit on error

echo "🚀 Supabase IaC Setup"
echo "===================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    echo "Install it from: https://supabase.com/docs/guides/cli"
    exit 1
fi

echo -e "${GREEN}✓${NC} Supabase CLI found"

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠${NC}  Not logged in to Supabase"
    echo "Please run: supabase login"
    exit 1
fi

echo -e "${GREEN}✓${NC} Logged in to Supabase"
echo ""

# Function to create a branch
create_branch() {
    local branch_name=$1
    local is_persistent=$2

    echo "Creating branch: $branch_name"

    if [ "$is_persistent" = "true" ]; then
        supabase --experimental branches create --persistent --name "$branch_name"
    else
        supabase --experimental branches create --name "$branch_name"
    fi

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Branch '$branch_name' created successfully"
    else
        echo -e "${RED}❌ Failed to create branch '$branch_name'${NC}"
        return 1
    fi
}

# Main setup flow
echo "📋 Setup Options:"
echo "1. Create development branch (persistent)"
echo "2. List existing branches"
echo "3. Link to existing project"
echo "4. Exit"
echo ""
read -p "Select an option (1-4): " option

case $option in
    1)
        echo ""
        echo "Creating persistent development branch..."
        echo -e "${YELLOW}Note: This will incur costs (~$0.01344/hour)${NC}"
        read -p "Continue? (y/n): " confirm

        if [ "$confirm" = "y" ]; then
            create_branch "develop" "true"

            echo ""
            echo -e "${GREEN}✓${NC} Development branch created!"
            echo ""
            echo "Next steps:"
            echo "1. Run: supabase --experimental branches list"
            echo "2. Copy the 'develop' branch project ID"
            echo "3. Update supabase/config.toml with the project ID"
            echo "4. Get API keys from Supabase Dashboard"
            echo "5. Update .env.local with the credentials"
        fi
        ;;
    2)
        echo ""
        echo "Listing branches..."
        supabase --experimental branches list
        ;;
    3)
        echo ""
        echo "Linking to existing project..."
        supabase link
        ;;
    4)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✓${NC} Setup complete!"
