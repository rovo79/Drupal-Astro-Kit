# GitHub Actions Guide

This guide explains the CI/CD pipeline configuration using GitHub Actions.

## Workflow Overview

The project uses GitHub Actions for:

- Automated testing
- Frontend deployment to Cloudflare Pages
- Backend deployment via DDEV
- Environment-specific deployments

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
          if [ ! -f ".env" ]; then
            echo "::error::.env file is missing"
            exit 1
          fi
          if [ ! -f "wrangler.toml" ]; then
            echo "::error::wrangler.toml file is missing"
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
          VITE_API_URL: ${{ env.ENVIRONMENT == 'production' && secrets.PROD_API_URL || secrets.STAGING_API_URL }}

      - name: Deploy to Cloudflare
        if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: ${{ env.ENABLE_SSR == 'true' && 'deploy' || 'pages deploy' }}
          projectName: ${{ env.PROJECT_NAME }}
          directory: astro-frontend/dist

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
ENABLE_SSR: false
```

### Staging

```yaml
ENVIRONMENT: staging
ENABLE_SSR: true
```

### Production

```yaml
ENVIRONMENT: production
ENABLE_SSR: true
```

## Required Secrets

```yaml
# Cloudflare
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_PROJECT_NAME

# DDEV
PROD_DDEV_HOST
PROD_DDEV_SSH_KEY

# API URLs
STAGING_API_URL
PROD_API_URL
```

## Setting Up Secrets

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add each secret with its corresponding value

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
