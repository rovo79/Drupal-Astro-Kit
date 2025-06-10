#!/usr/bin/env bash

# Uncomment for debugging
# set -ex

# Strict mode
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project root (one level up from scripts dir)
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ORIGINAL_DIR="$PWD"

generate_secure_string() {
  # Generate a secure random string of 32 characters
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32 | tr -d '\n' | cut -c1-32
  else
    # Fallback if openssl is not available
    LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 32
  fi
}

# Function to read .env file
read_env_file() {
    if [ -f "$PROJECT_ROOT/.env" ]; then
        export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
        return 0
    else
        echo -e "${RED}Error:${NC} .env file not found. Please run env-sync.sh first."
        return 1
    fi
}

# Function to change directory and restore
cd_and_run() {
    local target_dir="$1"
    shift
    if [ -d "$target_dir" ]; then
        cd "$target_dir"
        "$@"
        cd "$ORIGINAL_DIR"
    else
        print_error "Directory does not exist: $target_dir"
        exit 1
    fi
}

# Trap errors and cleanup
check_and_update_env_file() {
    echo -e "\nChecking .env file integrity..."
    local env_file="$PROJECT_ROOT/.env"
    local need_update=false
    if [ -f "$env_file" ]; then
        # SESSION_SECRET - macOS compatible sed syntax
        if grep -q "SESSION_SECRET=your-session-secret" "$env_file" || grep -q "SESSION_SECRET=$" "$env_file"; then
            echo "🔄 Generating secure SESSION_SECRET..."
            local new_session_secret=$(generate_secure_string)
            sed -i '' "s|SESSION_SECRET=.*|SESSION_SECRET=$new_session_secret|" "$env_file"
            need_update=true
        fi
        # COOKIE_SECRET - macOS compatible sed syntax
        if grep -q "COOKIE_SECRET=your-cookie-secret" "$env_file" || grep -q "COOKIE_SECRET=$" "$env_file"; then
            echo "🔄 Generating secure COOKIE_SECRET..."
            local new_cookie_secret=$(generate_secure_string)
            sed -i '' "s|COOKIE_SECRET=.*|COOKIE_SECRET=$new_cookie_secret|" "$env_file"
            need_update=true
        fi
        # No need to remove backup files as we're not creating them
        if [ "$need_update" = true ]; then
            echo "✅ Security variables updated with secure random values"
        else
            echo "✅ Security variables already configured"
        fi
    else
        echo "❌ .env file not created"
    fi
}


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
        local version=$(eval "$version_cmd")
        if [ $? -ne 0 ]; then
            print_error "Failed to get version for $tool"
        fi
        if [ "$(printf '%s\n' "$min_version" "$version" | sort -V | head -n1)" != "$min_version" ]; then
            print_error "$tool version $min_version or higher is required. Found version $version"
        fi
    fi
}

# Read environment variables from .env
read_env_file || {
    echo -e "${RED}Error:${NC} Failed to read .env file"
    exit 1
}

# Verify PROJECT_NAME is set
if [ -z "${PROJECT_NAME:-}" ]; then
    echo -e "${RED}Error:${NC} PROJECT_NAME not set in .env file. Please run env-sync.sh first."
    exit 1
fi

print_status "Checking dependencies..."
check_tool "docker" "20.10.0" "docker version --format '{{.Server.Version}}'"
check_tool "ddev" "1.22.0" "ddev --version | cut -d' ' -f3"
check_tool "composer" "2.0.0" "composer --version | cut -d' ' -f3"
check_tool "npm" "8.0.0" "npm --version"

if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker and try again."
fi
if ! ddev describe &> /dev/null; then
    print_warning "DDEV is not properly configured. This is normal for first-time setup."
fi
if [ ! -f "$PROJECT_ROOT/README.md" ]; then
    print_error "Please run this script from the project root directory"
fi

print_status "Setting up Drupal backend for project: $PROJECT_NAME"
print_status "Preparing drupal-backend directory..."
if [ -d "$PROJECT_ROOT/drupal-backend" ]; then
    print_status "Cleaning existing drupal-backend directory..."
    rm -rf "$PROJECT_ROOT/drupal-backend"/*
else
    print_status "Creating drupal-backend directory..."
    mkdir -p "$PROJECT_ROOT/drupal-backend"
fi

# 1. Init DDEV for Drupal 11
print_status "Initializing DDEV configuration..."
cd "$PROJECT_ROOT/drupal-backend"
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
    exit 1
fi
sleep 2
if ! ddev exec which drush > /dev/null; then
    print_error "Drush not found after installation"
    exit 1
fi
if ! ddev exec drush site:install --account-name=admin --account-pass=admin -y; then
    print_error "Failed to install Drupal site. Check Drush logs for details."
    exit 1
fi

ddev composer require drupal/devel --dev
ddev exec drush en jsonapi devel devel_generate -y

ddev exec drush devel-generate:content 1 --bundles=article
print_status "Sample content has been created for Article type"

# 5. Generate or update .env file for Astro frontend
print_status "Generating environment configuration..."

# Get DDEV site URL
DDEV_URL=""
DDEV_JSON=$(ddev describe -j 2>&1)  # capture stderr
if [ $? -ne 0 ]; then
  print_warning "⚠️  Failed to run 'ddev describe -j'. Output:"
  echo "$DDEV_JSON"
  DDEV_URL="http://${PROJECT_NAME}.ddev.site"
else
  DDEV_URL=$(ddev describe -j | jq -r '.raw.httpsurl // .raw.httpurl // empty')
  if [ -z "$DDEV_URL" ]; then
    print_warning "⚠️  Could not extract URL from ddev describe output. Using default."
    DDEV_URL="http://${PROJECT_NAME}.ddev.site"
  fi
fi

# Get Drupal site UUID
SITE_UUID=""
if ddev exec which drush > /dev/null; then
    SITE_UUID=$(ddev exec drush cget system.site uuid --format=string 2>/dev/null)
fi
if [ -z "$SITE_UUID" ]; then
    print_warning "Could not get site UUID, using default"
    SITE_UUID="default"
fi

# Generate secure values
print_status "Generating secure keys..."
API_KEY="$(openssl rand -hex 32)"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
SESSION_SECRET_VAL="$(openssl rand -hex 32)"
COOKIE_SECRET_VAL="$(openssl rand -hex 32)"

# Move to project root
cd "$PROJECT_ROOT"

# Debug output to check variable values
echo "API_KEY: ${API_KEY:0:8}..."
echo "SESSION_SECRET: ${SESSION_SECRET_VAL:0:8}..."
echo "COOKIE_SECRET: ${COOKIE_SECRET_VAL:0:8}..."

# Determine if we need to update the .env file
ENV_FILE="${PROJECT_ROOT}/.env"
if [ -f "$ENV_FILE" ]; then
    print_status "Updating existing .env file with Drupal configuration..."

    # Function to update a value in .env file
    update_env_var() {
        local key=$1
        local value=$2
        if grep -q "^${key}=" "$ENV_FILE"; then
            # Replace existing value
            sed -i '' "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        else
            # Add new value
            echo "${key}=${value}" >> "$ENV_FILE"
        fi
    }

    # Update only the necessary values
    update_env_var "DRUPAL_BASE_URL" "${DDEV_URL}"
    update_env_var "DRUPAL_API_URL" "${DDEV_URL}/jsonapi"
    update_env_var "DRUPAL_API_USER" "admin"
    update_env_var "DRUPAL_API_PASS" "admin"
    update_env_var "DRUPAL_SITE_UUID" "${SITE_UUID}"
    update_env_var "DRUPAL_API_KEY" "${API_KEY}"

    # Always update security variables with new secure values
    print_status "Updating security variables in .env file..."

    # Check if security variables exist but with placeholder values
    if grep -q "SESSION_SECRET=your-session-secret" "$ENV_FILE" || grep -q "COOKIE_SECRET=your-cookie-secret" "$ENV_FILE"; then
        print_status "Found placeholder security values, replacing with secure values..."
        echo "Before replacement: $(grep -E 'SESSION_SECRET|COOKIE_SECRET' "$ENV_FILE")"

        # On macOS, sed requires an empty string for -i
        sed -i.bak "s/SESSION_SECRET=your-session-secret/SESSION_SECRET=${SESSION_SECRET_VAL}/" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
        sed -i.bak "s/COOKIE_SECRET=your-cookie-secret/COOKIE_SECRET=${COOKIE_SECRET_VAL}/" "$ENV_FILE" && rm -f "$ENV_FILE.bak"

        echo "After replacement: $(grep -E 'SESSION_SECRET|COOKIE_SECRET' "$ENV_FILE")"
        print_status "Replaced placeholder security values with secure random values"
    elif ! grep -q "SESSION_SECRET" "$ENV_FILE" || ! grep -q "COOKIE_SECRET" "$ENV_FILE"; then
        # Security variables don't exist, add them at the end
        print_status "Adding missing security variables to .env file..."

        # Add security section at the end
        cat >> "$ENV_FILE" << EOF

# Security
# Change these values in production
SESSION_SECRET=${SESSION_SECRET_VAL}
COOKIE_SECRET=${COOKIE_SECRET_VAL}
EOF
        print_status "Successfully added security variables"
    else
        # Security variables exist with non-placeholder values, update them
        update_env_var "SESSION_SECRET" "${SESSION_SECRET_VAL}"
        update_env_var "COOKIE_SECRET" "${COOKIE_SECRET_VAL}"
        print_status "Updated existing security variables with new secure values"
    fi

    print_status "Successfully updated .env file"
else
    # .env file doesn't exist, this is an error as env-sync.sh should be run first
    print_error "No .env file found. Please run 'bash scripts/env-sync.sh' first to create it."
    exit 1
fi

# Check if the file was created/updated successfully
if ! grep -i "SECRET" "$ENV_FILE" > /dev/null; then
    print_warning "SECRET variables may not have been properly written to .env"
fi

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
# Check if the file was created/updated successfully
if ! grep -i "SECRET" "$ENV_FILE" > /dev/null; then
    print_warning "SECRET variables may not have been properly written to .env"
fi
echo -e "\n${GREEN}✅ setup-ddev.sh completed successfully${NC}"
exit 0
