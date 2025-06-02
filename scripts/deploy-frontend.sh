#!/usr/bin/env bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

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

# 2. Build
print_status "Building frontend..."
if ! npm run build; then
    print_error "Build failed. Check the build logs for details."
fi

# 3. Deploy using Workers instead of Pages
print_status "Deploying to Cloudflare Workers..."
if ! npx wrangler deploy; then
    print_error "Deployment failed. Check the deployment logs for details."
fi

print_status "✅ Frontend deployment complete!"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Your site should be available at: https://${PROJECT_NAME}.${CLOUDFLARE_WORKERS_SUBDOMAIN:-workers.dev}"
echo "2. Check Cloudflare Dashboard for deployment status"
echo "3. Monitor your site's performance in Cloudflare Analytics"
