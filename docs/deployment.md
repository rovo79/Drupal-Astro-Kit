# Deployment Guide

This guide covers how to deploy your Drupal + Astro site to production.

## Frontend Deployment

### Cloudflare Pages

1. **Initial Setup**
   - Connect your GitHub repository to Cloudflare Pages
   - Configure build settings:
     - Build command: `npm run build`
     - Build output directory: `dist`
     - Node.js version: 20

2. **Environment Variables**

   ```bash
   NODE_ENV=production
   VITE_API_URL=https://your-drupal-backend.com
   ```

3. **Custom Domains**
   - Go to Cloudflare Dashboard → Pages
   - Select your project
   - Click "Custom domains"
   - Follow the setup wizard

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
