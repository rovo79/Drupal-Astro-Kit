#!/usr/bin/env bash
set -e

# Deploy Frontend to Cloudflare Pages (Static Site)
#
# This script builds the Astro frontend and deploys static files
# to Cloudflare Pages. The site has NO runtime dependencies on Drupal.
#
# Prerequisites:
#   - Node.js 20+
#   - npm
#   - Cloudflare account with Pages enabled
#   - CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in .env
#
# Usage:
#   ./scripts/deploy-frontend.sh
#
# The script will:
#   1. Build the Astro site (fetches content from Drupal at build time)
#   2. Deploy static files to Cloudflare Pages

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Use PROJECT_NAME from env
if [ -z "$PROJECT_NAME" ]; then
    echo -e "${RED}Error:${NC} PROJECT_NAME not set. Add it to your .env file."
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

# Print warning
print_warning() {
    echo -e "${YELLOW}Warning:${NC} $1"
}

# Check for required tools
for cmd in npm npx; do
  if ! command -v $cmd &> /dev/null; then
    print_error "'$cmd' is not installed or not in your PATH."
  fi
done

# Check for required environment variables
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    print_error "CLOUDFLARE_API_TOKEN not set. Please add it to your .env file."
fi

if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
    print_error "CLOUDFLARE_ACCOUNT_ID not set. Please add it to your .env file."
fi

print_status "Deploying frontend for project: $PROJECT_NAME"

# Navigate to frontend directory
cd astro-frontend

# 1. Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# 2. Build (this fetches from Drupal and generates static HTML)
print_status "Building static site..."
print_status "Fetching content from Drupal JSON:API..."

if ! npm run build; then
    print_error "Build failed. Make sure DDEV is running: cd drupal-backend && ddev start"
fi

# 3. Deploy to Cloudflare Pages
print_status "Deploying to Cloudflare Pages..."

# Use wrangler pages deploy with the static output directory
if ! npx wrangler pages deploy ./dist --project-name="$PROJECT_NAME"; then
    print_warning "If this is your first deployment, create the Pages project first:"
    print_warning "  npx wrangler pages project create $PROJECT_NAME"
    print_error "Deployment failed. Check the logs above for details."
fi

print_status "✅ Frontend deployment complete!"
echo ""
echo -e "${GREEN}Your static site is now live!${NC}"
echo ""
echo "  Production URL: https://${PROJECT_NAME}.pages.dev"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. View your site at the URL above"
echo "  2. To update content: edit in Drupal, then run this script again"
echo "  3. Set up a custom domain in Cloudflare Pages dashboard"
echo ""
