# Deployment Guide

This guide covers how to deploy your Drupal + Astro site to production.

## Frontend Deployment

### Cloudflare Workers

1. **Initial Setup**
   - Configure your `wrangler.toml` file with project settings
   - Set up KV namespaces for session management
   - Deploy using the provided script or Wrangler CLI

2. **Build and Deploy**

   ```bash
   # Using the provided script
   zsh scripts/deploy-frontend.sh

   # Or manually
   cd astro-frontend
   npm run build
   npx wrangler deploy
   ```

3. **Environment Variables**

   ```bash
   NODE_ENV=production
   DRUPAL_API_URL=https://your-drupal-backend.com/jsonapi
   CLOUDFLARE_API_TOKEN=your_api_token
   ```

4. **Verify Deployment**

   ```bash
   # Check deployment status
   npx wrangler whoami

   # Test your deployed site
   curl https://your-project-name.your-subdomain.workers.dev
   ```

5. **Custom Domains**
   - Go to Cloudflare Dashboard → Workers & Pages
   - Select your project
   - Click "Settings" → "Triggers"
   - Add custom domain following the setup wizard

## Backend Deployment

### DDEV Production Setup

1. **Configure Production Environment**

   ```bash
   # .ddev/config.production.yaml
   php_version: "8.3"
   webserver_type: nginx-fpm
   router_http_port: "80"
   router_https_port: "443"
   ```

2. **Deploy Backend**

   ```bash
   ddev start
   ddev composer install --no-dev
   ddev drush deploy
   ```

## CI/CD Pipeline

### GitHub Actions

The project includes automated deployment through GitHub Actions. See [GitHub Actions Guide](github-actions.md) for detailed configuration.

### Required Secrets

```bash
CLOUDFLARE_API_TOKEN      # Your Cloudflare API token
CLOUDFLARE_ACCOUNT_ID     # Your Cloudflare account ID
CLOUDFLARE_PROJECT_NAME   # Your Cloudflare Pages project name
PROD_DDEV_HOST           # Production DDEV host
PROD_DDEV_SSH_KEY        # SSH key for production DDEV access
```

## Deployment Checklist

- [ ] Frontend environment variables configured
- [ ] Backend environment variables set
- [ ] Database backups configured
- [ ] SSL certificates verified
- [ ] Custom domains configured
- [ ] Monitoring tools set up
- [ ] Error tracking configured
- [ ] Performance monitoring enabled

## Troubleshooting

See [Troubleshooting Guide](troubleshooting.md) for common deployment issues and solutions.
