#!/usr/bin/env bash
set -e

# Quickly seed your local .env from the committed template:

if [ ! -f .env ]; then
  cp .env.example .env
  # Inject Drupal JSON:API endpoint
  DRUPAL_API_URL="http://drupal-backend.ddev.site/jsonapi"
  if grep -q "^DRUPAL_API_URL=" .env; then
    sed -i '' "s|^DRUPAL_API_URL=.*|DRUPAL_API_URL=$DRUPAL_API_URL|" .env
  else
    echo "DRUPAL_API_URL=$DRUPAL_API_URL" >> .env
  fi
  echo "✅ .env created from .env.example and updated with DRUPAL_API_URL"
else
  echo "ℹ️  .env already exists, skipping."
fi

# Guards against “forgot to copy .env” errors and keeps secrets out of Git.
