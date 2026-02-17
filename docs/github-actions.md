# GitHub Actions Guide

**Status:** draft/legacy (Workers-focused). The kit defaults to **static-first** (Astro SSG + Cloudflare Pages).

This guide explains the CI/CD pipeline configuration using GitHub Actions for Cloudflare Workers deployment.

## Workflow Overview

The project uses GitHub Actions for:

- Automated testing and validation
- Frontend deployment to Cloudflare Workers
- Backend deployment via DDEV
- Environment-specific deployments with SSR support

## Workflow Configuration

### Basic Structure

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, staging ]
  pull_request:
    branches: [ main, staging ]

env:
  PROJECT_NAME: ${{ github.event.repository.name }}

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check Required Files
        run: |
          if [ ! -f ".env.example" ]; then
            echo "::error::.env.example file is missing"
            exit 1
          fi
          if [ ! -f "wrangler.toml" ]; then
            echo "::error::wrangler.toml file is missing"
            exit 1
          fi
          if [ ! -f "astro-frontend/.assetsignore" ]; then
            echo "::error::.assetsignore file is missing"
            exit 1
          fi

  frontend:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: 'astro-frontend/package-lock.json'

      - name: Install Dependencies
        run: |
          cd astro-frontend
          npm ci

      - name: Build Frontend
        run: |
          cd astro-frontend
          npm run build
        env:
          NODE_ENV: ${{ env.ENVIRONMENT }}
          DRUPAL_API_URL: ${{ env.ENVIRONMENT == 'production' && secrets.PROD_API_URL || secrets.STAGING_API_URL }}

      - name: Deploy to Cloudflare Workers
        if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy
          workingDirectory: astro-frontend

  backend:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup DDEV
        run: |
          curl -fsSL https://raw.githubusercontent.com/ddev/ddev/master/scripts/install_ddev.sh | bash
          ddev config --project-type=drupal11 --docroot=web
          ddev start

      - name: Install Dependencies
        run: |
          cd drupal-backend
          ddev composer install --no-dev

      - name: Deploy Backend
        if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
        run: |
          ddev drush deploy
```

## Environment Configuration

### Development

```yaml
ENVIRONMENT: development
NODE_ENV: development
```

### Staging

```yaml
ENVIRONMENT: staging
NODE_ENV: production
```

### Production

```yaml
ENVIRONMENT: production
NODE_ENV: production
```

## Required Secrets

```yaml
# Cloudflare Workers
CLOUDFLARE_API_TOKEN

# API URLs
STAGING_API_URL
PROD_API_URL

# DDEV (for backend deployment)
PROD_DDEV_HOST
PROD_DDEV_SSH_KEY
```

## Setting Up Secrets

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add each secret with its corresponding value

### Cloudflare API Token

Create a token with these permissions:

- Account: `Cloudflare Workers:Edit`
- Zone: `Zone Settings:Read` (if using custom domains)
- Zone: `DNS:Edit` (if using custom domains)

## Best Practices

1. **Security**
   - Never commit secrets to the repository
   - Use environment-specific secrets
   - Rotate secrets regularly

2. **Performance**
   - Use caching for dependencies
   - Optimize build steps
   - Run tests in parallel

3. **Monitoring**
   - Set up notifications for failures
   - Monitor deployment times
   - Track resource usage

## Troubleshooting

Common issues and solutions:

1. **Failed Deployments**
   - Check secret values
   - Verify environment variables
   - Review build logs

2. **Timeout Issues**
   - Optimize build steps
   - Increase timeout limits
   - Use caching

3. **Permission Errors**
   - Verify secret permissions
   - Check Cloudflare access
   - Review DDEV configuration

See [Troubleshooting Guide](troubleshooting.md) for more details.
