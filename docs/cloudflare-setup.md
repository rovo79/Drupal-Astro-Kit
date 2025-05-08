# Cloudflare Setup Guide

This guide explains how to configure Cloudflare for your Drupal + Astro project.

## Cloudflare Pages vs Workers

### Cloudflare Pages

- Static site hosting platform
- Handles Astro frontend deployment
- Features:
  - Automatic builds from Git
  - Asset optimization
  - Global CDN distribution
  - Automatic SSL certificates
  - Preview deployments

### Cloudflare Workers

- Serverless computing platform
- Optional for additional functionality
- Use cases:
  - API routes
  - Server-side rendering (SSR)
  - Custom middleware
  - Edge functions

## Initial Setup

1. **Create Cloudflare Account**
   - Sign up at [cloudflare.com](https://cloudflare.com)
   - Verify your email
   - Add your domain (if using custom domain)

2. **Configure Pages Project**
   - Go to Pages dashboard
   - Click "Create a project"
   - Connect your GitHub repository
   - Configure build settings:

     ```yaml
     Build command: npm run build
     Build output directory: dist
     Node.js version: 20
     ```

3. **Environment Variables**

   ```bash
   NODE_ENV=production
   VITE_API_URL=https://your-drupal-backend.com
   ```

## Custom Domains

1. **Domain Requirements**
   - Domain must be managed by Cloudflare
   - DNS records will be automatically configured
   - SSL certificates are automatically provisioned

2. **Setup Process**
   - Go to Pages dashboard
   - Select your project
   - Click "Custom domains"
   - Click "Set up a custom domain"
   - Follow the setup wizard

3. **Multiple Domains**
   - Add multiple custom domains
   - Each domain gets its own SSL certificate
   - All domains point to the same deployment

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

1. **Caching**
   - Browser cache TTL
   - Edge cache rules
   - Cache purge options

2. **Image Optimization**
   - Automatic image optimization
   - WebP conversion
   - Responsive images

3. **Minification**
   - JavaScript minification
   - CSS minification
   - HTML minification

## Monitoring

1. **Analytics**
   - Page views
   - Bandwidth usage
   - Cache hit ratio

2. **Logs**
   - Request logs
   - Error logs
   - Security events

3. **Alerts**
   - Performance alerts
   - Security alerts
   - Usage alerts

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
