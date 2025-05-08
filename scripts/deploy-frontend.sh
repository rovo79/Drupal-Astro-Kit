#!/usr/bin/env bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Use PROJECT_NAME from env-sync.sh
if [ -z "$PROJECT_NAME" ]; then
    echo -e "${RED}Error:${NC} PROJECT_NAME not set. Please run env-sync.sh first."
    exit 1
fi

# Print status message
print_status() {
    echo -e "${GREEN}==>${NC} $1"
}

# Print error message
print_error() {
    echo -e "${RED}Error:${NC} $1"
    exit 1
}

# Print warning message
print_warning() {
    echo -e "${YELLOW}Warning:${NC} $1"
}

# Check for required environment variables
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    print_error "CLOUDFLARE_API_TOKEN not set. Please add it to your .env file."
fi

if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
    print_error "CLOUDFLARE_ACCOUNT_ID not set. Please add it to your .env file."
fi

print_status "Deploying frontend for project: $PROJECT_NAME"

# Ensure we're in the project root
if [ ! -f "wrangler.toml" ]; then
    print_error "wrangler.toml not found. Please run setup-astro.sh first."
fi

# Navigate to frontend directory
cd astro-frontend

# 1. Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# 2. Build
print_status "Building frontend..."
if ! npm run build; then
    print_error "Build failed. Check the build logs for details."
fi

# 3. Deploy to Pages
print_status "Deploying to Cloudflare Pages..."
if ! npx wrangler pages deploy ./dist \
    --project-name="$PROJECT_NAME" \
    --branch="main" \
    --commit-dirty=true; then
    print_error "Deployment failed. Check the deployment logs for details."
fi

print_status "✅ Frontend deployment complete!"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Your site should be available at: https://${PROJECT_NAME}.pages.dev"
echo "2. Check Cloudflare Dashboard for deployment status"
echo "3. Monitor your site's performance in Cloudflare Analytics"

# Note: This script is designed to be run both locally and in CI/CD environments.
# It uses project-specific configuration from wrangler.toml and .env files.
