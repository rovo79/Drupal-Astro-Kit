# Troubleshooting Guide

This guide covers common issues and their solutions for the Drupal + Astro starter kit.

## DDEV Issues

### Connection Problems

1. **DDEV Not Starting**

   ```bash
   # Check Docker status
   docker ps

   # Restart DDEV
   ddev restart

   # Check service status
   ddev describe
   ```

2. **Port Conflicts**

   ```bash
   # Check what's using the ports
   lsof -i :80
   lsof -i :443

   # Modify DDEV ports in .ddev/config.yaml
   router_http_port: "8080"
   router_https_port: "8443"
   ```

3. **Database Issues**

   ```bash
   # Reset database
   ddev delete -O
   ddev start

   # Check database logs
   ddev logs -s db
   ```

## Astro Frontend Issues

### Build Problems

1. **Node.js Version**

   ```bash
   # Check Node version
   node --version  # Should be 18+

   # Install correct version
   nvm install 20
   nvm use 20
   ```

2. **Dependency Issues**

   ```bash
   # Clean install
   cd astro-frontend
   rm -rf node_modules
   rm package-lock.json
   npm install
   ```

3. **Build Errors**

   ```bash
   # Check build logs
   npm run build --verbose

   # Clear build cache
   rm -rf dist
   ```

## Cloudflare Issues

### Deployment Problems

1. **Failed Deployments**
   - Check GitHub Actions logs
   - Verify Cloudflare API token
   - Check build settings

2. **Custom Domain Issues**
   - Verify DNS records
   - Check SSL certificate
   - Review domain settings

3. **Worker Errors**
   - Check Worker logs
   - Verify Worker configuration
   - Test Worker locally

## Environment Issues

### Configuration Problems

1. **Missing Environment Variables**

   ```bash
   # Regenerate env files
   scripts/env-sync.sh

   # Check .env files
   cat .env
   cat astro-frontend/.env
   ```

2. **API Connection Issues**
   - Verify API URL in .env
   - Check CORS settings
   - Test API endpoint

3. **Secret Management**
   - Verify GitHub secrets
   - Check Cloudflare secrets
   - Review environment variables

## Performance Issues

### Slow Loading

1. **Frontend Performance**
   - Check build optimization
   - Verify image optimization
   - Review caching settings

2. **Backend Performance**
   - Check database queries
   - Review caching configuration
   - Monitor resource usage

3. **CDN Issues**
   - Check cache hit ratio
   - Verify CDN configuration
   - Review cache rules

## Security Issues

### Common Problems

1. **SSL/TLS Issues**
   - Check certificate validity
   - Verify SSL configuration
   - Review security settings

2. **Authentication Problems**
   - Check session configuration
   - Verify token handling
   - Review security headers

3. **API Security**
   - Check API authentication
   - Verify request validation
   - Review security policies

## Getting Help

1. **Documentation**
   - Check [Deployment Guide](deployment.md)
   - Review [SSR Guide](ssr-guide.md)
   - See [GitHub Actions Guide](github-actions.md)

2. **Community Support**
   - Drupal Forums
   - Astro Discord
   - Cloudflare Community

3. **Professional Support**
   - Cloudflare Support
   - Drupal Association
   - Astro Team

## Best Practices

1. **Prevention**
   - Regular updates
   - Security audits
   - Performance monitoring

2. **Monitoring**
   - Set up alerts
   - Track errors
   - Monitor performance

3. **Maintenance**
   - Regular backups
   - Security patches
   - Performance optimization
