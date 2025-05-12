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

# Check if a command exists and its version
check_tool() {
    local tool=$1
    local min_version=$2
    local version_cmd=$3

    if ! command -v $tool &> /dev/null; then
        print_error "'$tool' is not installed or not in your PATH."
    fi

    if [ ! -z "$min_version" ]; then
        # Execute the version command and capture its output
        local version=$(eval "$version_cmd")
        if [ $? -ne 0 ]; then
            print_error "Failed to get version for $tool"
        fi

        # Compare versions
        if [ "$(printf '%s\n' "$min_version" "$version" | sort -V | head -n1)" != "$min_version" ]; then
            print_error "$tool version $min_version or higher is required. Found version $version"
        fi
    fi
}

# Check for required tools with version requirements
print_status "Checking dependencies..."

# Check Docker
check_tool "docker" "20.10.0" "docker version --format '{{.Server.Version}}'"

# Check DDEV
check_tool "ddev" "1.22.0" "ddev --version | cut -d' ' -f3"

# Check Composer
check_tool "composer" "2.0.0" "composer --version | cut -d' ' -f3"

# Check npm (required for frontend)
check_tool "npm" "8.0.0" "npm --version"

# Check Docker is running
if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker and try again."
fi

# Check DDEV is properly configured
if ! ddev describe &> /dev/null; then
    print_warning "DDEV is not properly configured. This is normal for first-time setup."
fi

# Ensure we're in the project root
if [ ! -f "README.md" ]; then
    print_error "Please run this script from the project root directory"
fi

# Setup Drupal backend
print_status "Setting up Drupal backend for project: $PROJECT_NAME"

# 0. Ensure drupal-backend directory exists and is clean
if [ -d "drupal-backend" ]; then
    print_status "Cleaning existing drupal-backend directory..."
    rm -rf drupal-backend/*
fi
mkdir -p drupal-backend
cd drupal-backend

# 1. Init DDEV for Drupal 11
print_status "Initializing DDEV configuration..."
ddev config --project-type=drupal11 \
    --php-version=8.3 \
    --docroot=web \
    --project-name=$PROJECT_NAME \
    --auto

# 2. Start DDEV services
print_status "Starting DDEV services..."
if ! ddev start; then
    print_error "Failed to start DDEV services. Check DDEV logs for details."
fi

# 3. Create Drupal project
print_status "Creating Drupal 11 project..."
if ! ddev composer create drupal/recommended-project:^11 -y; then
    print_error "Failed to create Drupal project. Check composer logs for details."
fi

# 4. Install Drush and site
print_status "Installing Drush and configuring site..."
if ! ddev composer require drush/drush -q; then
    print_error "Failed to install Drush. Check composer logs for details."
fi

if ! ddev drush site:install --account-name=admin --account-pass=admin -y; then
    print_error "Failed to install Drupal site. Check Drush logs for details."
fi

# 5. Generate .env file for Astro frontend
print_status "Generating environment configuration..."

# Get DDEV site URL
DDEV_URL=$(ddev describe -j | jq -r '.raw.status.url')
if [ -z "$DDEV_URL" ]; then
    DDEV_URL="http://${PROJECT_NAME}.ddev.site"
fi

# Get Drupal site UUID
SITE_UUID=$(ddev drush cget system.site uuid --format=string)
if [ -z "$SITE_UUID" ]; then
    print_warning "Could not get site UUID, using default"
    SITE_UUID="default"
fi

# Generate random API key for security
API_KEY=$(openssl rand -hex 32)

# Get current timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

cd ..
cat > .env << EOL
# Generated on: $(date)
# Project Configuration
PROJECT_NAME=${PROJECT_NAME}

# Drupal Backend Configuration
DRUPAL_API_URL=${DDEV_URL}/jsonapi
DRUPAL_API_USER=admin
DRUPAL_API_PASS=admin
DRUPAL_SITE_UUID=${SITE_UUID}
DRUPAL_API_KEY=${API_KEY}

# Environment
NODE_ENV=development
DRUPAL_ENV=local

# Cloudflare Configuration
# Add your Cloudflare configuration here
# CLOUDFLARE_API_TOKEN=
# CLOUDFLARE_ACCOUNT_ID=

# Build Configuration
BUILD_TIMESTAMP=${TIMESTAMP}
BUILD_ENV=development

# Security
# Change these values in production
SESSION_SECRET=$(openssl rand -hex 32)
COOKIE_SECRET=$(openssl rand -hex 32)
EOL

# Create .env.example without sensitive values
cat > .env.example << EOL
# Project Configuration
PROJECT_NAME=your-project-name

# Drupal Backend Configuration
DRUPAL_API_URL=http://your-project-name.ddev.site/jsonapi
DRUPAL_API_USER=admin
DRUPAL_API_PASS=admin
DRUPAL_SITE_UUID=your-site-uuid
DRUPAL_API_KEY=your-api-key

# Environment
NODE_ENV=development
DRUPAL_ENV=local

# Cloudflare Configuration
# CLOUDFLARE_API_TOKEN=
# CLOUDFLARE_ACCOUNT_ID=

# Build Configuration
BUILD_TIMESTAMP=timestamp
BUILD_ENV=development

# Security
SESSION_SECRET=your-session-secret
COOKIE_SECRET=your-cookie-secret
EOL

# 6. Output success message and next steps
print_status "Drupal backend setup complete!"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run 'ddev launch' to open your Drupal site at ${DDEV_URL}"
echo "2. Your project name is: ${PROJECT_NAME}"
echo "3. DDEV site URL: ${DDEV_URL}"
