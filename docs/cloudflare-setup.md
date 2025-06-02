# Cloudflare Workers Setup Guide

This guide explains how to configure Cloudflare Workers for your Drupal + Astro project.

## Cloudflare Workers vs Pages

### Cloudflare Workers (Recommended)

- Serverless computing platform with SSR support
- Handles Astro frontend deployment with server-side rendering
- Features:
  - Server-side rendering (SSR)
  - Edge computing capabilities
  - KV storage integration
  - Built-in observability
  - Global distribution
  - Automatic scaling

### Cloudflare Pages (Legacy)

- Static site hosting platform
- Limited to static site generation
- Use cases:
  - Static-only websites
  - JAMstack applications
  - No server-side rendering needed

## Initial Setup

1. **Create Cloudflare Account**
   - Sign up at [cloudflare.com](https://cloudflare.com)
   - Verify your email
   - Add your domain (if using custom domain)

2. **Configure Workers Project**
   - Use the provided `wrangler.toml` configuration
   - Set up KV namespaces for session management
   - Configure SSR settings:

     ```toml
     name = "your-project-name"
     main = "./astro-frontend/dist/_worker.js/index.js"
     compatibility_date = "2024-01-01"
     compatibility_flags = ["nodejs_compat"]

     [assets]
     binding = "ASSETS"

     [[kv_namespaces]]
     binding = "SESSION"
     id = "your-kv-namespace-id"

     [observability]
     enabled = true
     ```

3. **Environment Variables**

   ```bash
   NODE_ENV=production
   DRUPAL_API_URL=https://your-drupal-backend.com/jsonapi
   ```

## Workers-Specific Setup

1. **KV Namespace Creation**

   ```bash
   # Create KV namespace for sessions
   npx wrangler kv namespace create "SESSION"

   # Update wrangler.toml with the returned namespace ID
   # The command will output the configuration needed
   ```

2. **Asset Configuration**

   ```bash
   # The .assetsignore file is automatically created with:
   _worker.js
   _routes.json
   ```

3. **Deployment**

   ```bash
   # Deploy your Workers application
   cd astro-frontend
   npx wrangler deploy

   # Your site will be available at:
   # https://your-project-name.your-subdomain.workers.dev
   ```

## Custom Domains

1. **Domain Requirements**
   - Domain must be managed by Cloudflare
   - DNS records will be automatically configured
   - SSL certificates are automatically provisioned

2. **Setup Process**
   - Go to Workers dashboard
   - Select your project
   - Click "Settings" → "Triggers"
   - Click "Add Custom Domain"
   - Follow the setup wizard

3. **Multiple Domains**
   - Add multiple custom domains
   - Each domain gets its own SSL certificate
   - All domains point to the same Worker deployment

## Security Features

1. **SSL/TLS**
   - Automatic SSL certificates
   - Always use HTTPS
   - HSTS support

2. **DDoS Protection**
   - Automatic DDoS mitigation
   - Rate limiting
   - Bot management

3. **WAF (Web Application Firewall)**
   - OWASP rules
   - Custom rules
   - IP reputation

## Performance Optimization

1. **Workers Features**
   - Edge computing with global distribution
   - Server-side rendering for dynamic content
   - Built-in caching and optimization
   - KV storage for session management

2. **Asset Optimization**
   - Automatic asset bundling
   - JavaScript and CSS optimization
   - Response compression

3. **Observability**
   - Built-in monitoring and logging
   - Real-time performance metrics
   - Error tracking and debugging

## Monitoring

1. **Workers Analytics**
   - Request count and latency
   - Error rates and status codes
   - Geographic distribution
   - CPU and memory usage

2. **Logs**
   - Real-time Worker logs
   - Console logs and errors
   - Exception tracking
   - Performance metrics

3. **Alerts**
   - Performance threshold alerts
   - Error rate monitoring
   - Resource usage warnings

## Best Practices

1. **Security**
   - Enable all security features
   - Use WAF rules
   - Monitor security events

2. **Performance**
   - Configure caching rules
   - Enable image optimization
   - Use minification

3. **Monitoring**
   - Set up alerts
   - Monitor analytics
   - Review logs regularly

## Troubleshooting

Common issues and solutions:

1. **Deployment Issues**
   - Check build logs
   - Verify environment variables
   - Review build settings

2. **Domain Issues**
   - Verify DNS records
   - Check SSL certificate
   - Review domain settings

3. **Performance Issues**
   - Check cache settings
   - Review optimization settings
   - Monitor resource usage

See [Troubleshooting Guide](troubleshooting.md) for more details.
