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

# Store original directory
ORIGINAL_DIR=$(pwd)

# Function to track directory changes
push_dir() {
    cd "$1" || {
        print_error "Failed to change to directory: $1"
        return 1
    }
}

# Function to return to original directory
pop_dir() {
    cd "$ORIGINAL_DIR" || {
        print_error "Failed to return to original directory: $ORIGINAL_DIR"
        return 1
    }
}

# Trap errors and cleanup
cleanup() {
    local exit_code=$?
    # Always return to original directory
    pop_dir

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
print_status "Preparing drupal-backend directory..."
if [ -d "drupal-backend" ]; then
    print_status "Cleaning existing drupal-backend directory..."
    rm -rf drupal-backend/*
else
    print_status "Creating drupal-backend directory..."
    mkdir -p drupal-backend
fi

# 1. Init DDEV for Drupal 11
print_status "Initializing DDEV configuration..."
push_dir "drupal-backend" || return 1
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
    return 1
fi

# Wait a moment for Drush to be available
sleep 2

# Verify Drush is available
if ! ddev exec which drush > /dev/null; then
    print_error "Drush not found after installation"
    return 1
fi

# Install Drupal site
if ! ddev exec drush site:install --account-name=admin --account-pass=admin -y; then
    print_error "Failed to install Drupal site. Check Drush logs for details."
    return 1
fi

# 5. Generate .env file for Astro frontend
print_status "Generating environment configuration..."

# Get DDEV site URL - try multiple methods to get the URL
DDEV_URL=""
if command -v jq &> /dev/null; then
    # Run ddev describe from drupal-backend directory
    push_dir "drupal-backend" || return 1
    DDEV_JSON=$(ddev describe -j 2>/dev/null)
    if [ $? -eq 0 ]; then
        # Try different JSON paths that might contain the URL
        DDEV_URL=$(echo "$DDEV_JSON" | jq -r '.raw.status.url // .raw.status.https_url // .raw.status.http_url // empty' 2>/dev/null)
    fi
    pop_dir
fi

# Fallback if jq fails or URL not found
if [ -z "$DDEV_URL" ]; then
    # Use the project name to construct the URL
    DDEV_URL="http://${PROJECT_NAME}.ddev.site"
    print_warning "Could not get URL from ddev describe, using default: $DDEV_URL"
fi

# Get Drupal site UUID - try multiple methods
SITE_UUID=""
push_dir "drupal-backend" || return 1
if ddev exec which drush > /dev/null; then
    SITE_UUID=$(ddev exec drush cget system.site uuid --format=string 2>/dev/null)
fi
pop_dir

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

print_status "✅ Drupal backend setup complete!"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run 'ddev launch' to open your Drupal site at ${DDEV_URL}"
echo "2. Your project name is: ${PROJECT_NAME}"
echo "3. Drupal admin credentials:"
echo "   - Username: admin"
echo "   - Password: admin"
echo "4. To verify the setup:"
echo "   - Run 'ddev status' to check DDEV services"
echo "   - Run 'ddev drush status' to check Drupal status"

# Explicitly return success
return 0
