#!/usr/bin/env bash

# Don't exit on error, we'll handle that in the cleanup
set +e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to read .env file
read_env_file() {
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
    else
        echo -e "${RED}Error:${NC} .env file not found. Please run env-sync.sh first."
        return 1
    fi
}

# Trap errors and cleanup
cleanup() {
    local exit_code=$?
    # If we're in the astro-frontend directory, go back to project root
    if [[ "$PWD" == *"astro-frontend"* ]]; then
        cd "$ORIGINAL_DIR"
    fi

    # Only show error message if there was an actual error
    if [ $exit_code -ne 0 ]; then
        echo -e "\n${RED}Script encountered an error (exit code: $exit_code)${NC}"
        echo -e "${YELLOW}Please check the output above for any issues${NC}\n"
    else
        echo -e "\n${GREEN}Script completed successfully!${NC}"
    fi

    # Always return 0 to prevent shell exit
    return 0
}

# Store original directory
ORIGINAL_DIR=$(pwd)

# Set up trap
trap cleanup EXIT ERR INT TERM

# Function to check command status
check_status() {
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error:${NC} Command failed: $1"
        return 1
    fi
    return 0
}

# Read environment variables from .env
read_env_file || {
    echo -e "${RED}Error:${NC} Failed to read .env file"
    return 1
}

# Verify PROJECT_NAME is set
if [ -z "$PROJECT_NAME" ]; then
    echo -e "${RED}Error:${NC} PROJECT_NAME not set in .env file. Please run env-sync.sh first."
    return 1
fi

# Print status message
print_status() {
    echo -e "${GREEN}==>${NC} $1"
}

# Print error message
print_error() {
    echo -e "${RED}Error:${NC} $1"
    return 1
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
if ! npm create astro@latest astro-frontend -- --template basics --yes; then
    print_error "Failed to create Astro project"
    return 1
fi

# 2. Install Cloudflare adapter and dependencies
print_status "Installing Cloudflare adapter and dependencies..."
cd astro-frontend || return 1
if ! npm install --save-dev wrangler; then
    print_error "Failed to install wrangler"
    return 1
fi

if ! npx astro add cloudflare; then
    print_error "Failed to add Cloudflare adapter"
    return 1
fi

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
  adapter: cloudflare({
    imageService: true,
    mode: 'directory'
  }),
  site: 'https://${PROJECT_NAME}.pages.dev',
  image: {
    service: {
      entrypoint: 'astro/assets/services/compile'
    }
  },
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
main = "workers-site/index.js"

# KV Namespace for sessions
# You'll need to create this namespace and update the ID
# Run: npx wrangler kv namespace create "SESSION"
[[kv_namespaces]]
binding = "SESSION"
id = "your-kv-namespace-id"  # Replace this with your actual namespace ID

[site]
bucket = "./astro-frontend/dist"

[build]
command = "cd astro-frontend && npm run build"
EOL
    echo -e "${YELLOW}Important:${NC} You need to create a KV namespace for sessions:"
    echo "1. Run: npx wrangler kv namespace create \"SESSION\""
    echo "2. Copy the namespace ID from the output"
    echo "3. Update the 'id' in wrangler.toml with your namespace ID"
else
    # Update existing wrangler.toml with project name and required fields
    sed -i '' "s|^name = .*|name = \"$PROJECT_NAME\"|" wrangler.toml
    if ! grep -q "main = " wrangler.toml; then
        echo "main = \"workers-site/index.js\"" >> wrangler.toml
    fi
    if ! grep -q "kv_namespaces" wrangler.toml; then
        echo -e "\n# KV Namespace for sessions\n# You'll need to create this namespace and update the ID\n# Run: npx wrangler kv namespace create \"SESSION\"\n[[kv_namespaces]]\nbinding = \"SESSION\"\nid = \"your-kv-namespace-id\"  # Replace this with your actual namespace ID" >> wrangler.toml
        echo -e "${YELLOW}Important:${NC} You need to create a KV namespace for sessions:"
        echo "1. Run: npx wrangler kv namespace create \"SESSION\""
        echo "2. Copy the namespace ID from the output"
        echo "3. Update the 'id' in wrangler.toml with your namespace ID"
    fi
fi

cd astro-frontend

print_status "✅ Astro frontend setup complete!"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run 'npm run dev' to start the development server"
echo "2. Your project is configured for Cloudflare Pages deployment"
echo "3. Environment variables are set up from your .env file"
echo -e "\n${YELLOW}Cloudflare Setup Required:${NC}"
echo "1. Create a KV namespace: npx wrangler kv namespace create \"SESSION\""
echo "2. Update wrangler.toml with your namespace ID"
echo "3. Verify setup: npx wrangler kv:namespace list"
echo -e "\n${YELLOW}Development Notes:${NC}"
echo "1. For local development, use: npx wrangler dev --remote"
echo "2. The SESSION binding is used by Astro's Cloudflare adapter"
echo "3. Check the Cloudflare Dashboard to manage your KV data"

# 6. Install additional dependencies
print_status "Installing additional dependencies..."
if ! npm install jsona drupal-jsonapi-params; then
    print_error "Failed to install additional dependencies"
    return 1
fi

# Explicitly return success
return 0
