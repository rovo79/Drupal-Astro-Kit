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

# Check for required tools
for cmd in npm npx; do
  if ! command -v $cmd &> /dev/null; then
    print_error "'$cmd' is not installed or not in your PATH."
  fi
done

print_status "Setting up Astro frontend for project: $PROJECT_NAME"

# 1. Create the Astro project
print_status "Creating Astro project..."
npm create astro@latest astro-frontend -- --template basics --yes

# 2. Install Cloudflare adapter and dependencies
print_status "Installing Cloudflare adapter and dependencies..."
cd astro-frontend
npm install --save-dev wrangler
npx astro add cloudflare

# 3. Configure project-specific settings
print_status "Configuring project settings..."

# Update package.json with project name
sed -i '' "s|\"name\": \"astro-frontend\"|\"name\": \"$PROJECT_NAME-frontend\"|" package.json

# Create project-specific configuration
cat > astro.config.mjs << EOL
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  site: 'https://${PROJECT_NAME}.pages.dev',
  vite: {
    build: {
      sourcemap: true
    }
  }
});
EOL

# 4. Set up environment configuration
print_status "Setting up environment configuration..."
if [ -f "../.env" ]; then
    cp ../.env .env
else
    print_error "No .env file found. Please run env-sync.sh first."
fi

# 5. Configure wrangler.toml
print_status "Configuring Cloudflare settings..."
cd ..
if [ ! -f wrangler.toml ]; then
    cat > wrangler.toml << EOL
name = "${PROJECT_NAME}"
compatibility_date = "$(date +%Y-%m-%d)"

[site]
bucket = "./astro-frontend/dist"

[build]
command = "cd astro-frontend && npm run build"
EOL
else
    # Update existing wrangler.toml with project name
    sed -i '' "s|^name = .*|name = \"$PROJECT_NAME\"|" wrangler.toml
fi

cd astro-frontend

print_status "✅ Astro frontend setup complete!"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run 'npm run dev' to start the development server"
echo "2. Your project is configured for Cloudflare Pages deployment"
echo "3. Environment variables are set up from your .env file"

# Ensures your Astro build is wired for Pages (via @astrojs/cloudflare) automatically.
