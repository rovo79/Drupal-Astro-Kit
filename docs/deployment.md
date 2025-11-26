# Deployment Guide

This guide covers how to deploy your Drupal + Astro static site to Cloudflare Pages.

> **V1 Static-First**: This kit deploys a fully static site to Cloudflare Pages. No server-side infrastructure required.

## Prerequisites

1. **Cloudflare Account**: Sign up at [dash.cloudflare.com](https://dash.cloudflare.com)
2. **API Token**: Create one with "Cloudflare Pages:Edit" permissions
3. **Wrangler CLI**: Installed in astro-frontend via setup script

## Frontend Deployment

### Quick Deploy

The simplest way to deploy:

```bash
# Make sure DDEV is running (for build-time content fetch)
cd drupal-backend && ddev start

# Deploy to Cloudflare Pages
./scripts/deploy-frontend.sh
```

This script:
1. Builds the Astro site (fetches content from local Drupal)
2. Deploys static files to Cloudflare Pages

### Manual Deployment

```bash
cd astro-frontend

# Build static site
npm run build

# Deploy to Pages
npx wrangler pages deploy ./dist --project-name=your-project
```

### First-Time Setup

If this is your first deployment:

```bash
# Login to Cloudflare
npx wrangler login

# Create the Pages project
npx wrangler pages project create your-project

# Then deploy
npx wrangler pages deploy ./dist --project-name=your-project
```

### Environment Variables

Set these in your `.env` file:

```bash
# Required for deployment
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_ACCOUNT_ID=your-account-id
PROJECT_NAME=your-project

# Used at build time (must be accessible)
DRUPAL_API_URL=http://your-project.ddev.site/jsonapi
```

## Custom Domains

1. Go to Cloudflare Dashboard → Pages
2. Select your project
3. Click "Custom domains"
4. Add your domain and follow DNS instructions

Your static site will be available at:
- `https://your-project.pages.dev` (default)
- `https://your-domain.com` (after custom domain setup)

## Updating Your Site

The deployment workflow is simple:

1. **Edit content** in Drupal at `http://your-project.ddev.site/admin/content`
2. **Rebuild and deploy**: `./scripts/deploy-frontend.sh`

Changes go live in seconds.

## CI/CD Automation (Optional)

For automated deployments, you need Drupal accessible during builds.

### Option 1: Local Build, Auto Deploy

Keep Drupal local, but automate the deploy step:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Pages
on:
  workflow_dispatch:  # Manual trigger

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      # Build locally first, commit dist/
      - name: Deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy ./astro-frontend/dist --project-name=${{ vars.PROJECT_NAME }}
```

### Option 2: Hosted Drupal for CI

For full CI/CD with automatic rebuilds:

1. Host Drupal on a staging server (Pantheon, Acquia, Platform.sh)
2. Set `DRUPAL_API_URL` to the hosted instance
3. Trigger builds on content changes

## Deployment Checklist

- [ ] `.env` file has CLOUDFLARE_API_TOKEN
- [ ] `.env` file has CLOUDFLARE_ACCOUNT_ID
- [ ] DDEV is running (for build-time content fetch)
- [ ] `npx wrangler login` completed
- [ ] Pages project created (first deploy only)
- [ ] Custom domain configured (optional)

## Troubleshooting

### Build Fails: "Cannot connect to Drupal"

DDEV must be running during the build:

```bash
cd drupal-backend && ddev start
```

### "Project not found" Error

Create the Pages project first:

```bash
npx wrangler pages project create your-project
```

### "Unauthorized" Error

Check your API token has the correct permissions:
- Account: Cloudflare Pages:Edit
- Zone: Optional (only needed for custom domains)

See [Troubleshooting Guide](troubleshooting.md) for more solutions.
