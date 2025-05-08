#!/usr/bin/env bash
set -e

# Get project name from directory
PROJECT_NAME=$(basename $(pwd))
PROJECT_NAME=${PROJECT_NAME//[^a-zA-Z0-9-]/}  # Sanitize project name

# Export project name for other scripts
export PROJECT_NAME

# Quickly seed your local .env from the committed template:
if [ ! -f .env ]; then
  cp .env.example .env

  # Update project-specific values
  sed -i '' "s|your-project-name|$PROJECT_NAME|g" .env

  # Inject Drupal JSON:API endpoint
  DRUPAL_API_URL="http://${PROJECT_NAME}.ddev.site/jsonapi"
  if grep -q "^DRUPAL_API_URL=" .env; then
    sed -i '' "s|^DRUPAL_API_URL=.*|DRUPAL_API_URL=$DRUPAL_API_URL|" .env
  else
    echo "DRUPAL_API_URL=$DRUPAL_API_URL" >> .env
  fi

  echo "✅ .env created from .env.example and updated with project-specific values"
  echo "📝 Project name: $PROJECT_NAME"
  echo "🌐 Drupal API URL: $DRUPAL_API_URL"
else
  # If .env exists, read PROJECT_NAME from it
  if [ -f .env ]; then
    PROJECT_NAME=$(grep "^PROJECT_NAME=" .env | cut -d'=' -f2)
    export PROJECT_NAME
  fi
  echo "ℹ️  .env already exists, using existing configuration"
fi

# Guards against "forgot to copy .env" errors and keeps secrets out of Git.
