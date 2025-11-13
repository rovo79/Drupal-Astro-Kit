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

### Runtime Errors (dev server)

1. **Cannot find package 'tslib' imported from @swc/helpers/esm/_ts_decorate.js**

   This means the TypeScript runtime helpers package `tslib` is missing. Some SWC helpers (e.g., for decorators) import from `tslib` at runtime.

   Fix:

   ```bash
   cd astro-frontend
   # install as a regular dependency (not dev)
   npm install tslib

   # optional but helpful checks
   node -p "require.resolve('tslib')"   # should print a path

   # restart dev server
   npm run dev
   ```

   If the error persists, do a clean install:

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run dev
   ```

## Cloudflare Workers Issues

### Deployment Problems

1. **Failed Workers Deployments**
   - Check `wrangler.toml` configuration
   - Verify Cloudflare API token permissions
   - Review build output for errors
   - Check compatibility flags and Node.js version

2. **KV Storage Issues**
   - Verify KV namespace ID in `wrangler.toml`
   - Check KV namespace permissions
   - Test KV access with `npx wrangler kv key list`
   - Use `--remote` flag for local development

3. **SSR Errors**
   - Check Worker logs in Cloudflare Dashboard
   - Verify Astro configuration for Workers
   - Review asset handling in `.assetsignore`
   - Test locally with `npx wrangler dev`

4. **Custom Domain Issues**
   - Verify DNS records in Cloudflare Dashboard
   - Check SSL certificate status
   - Review Workers route configuration
   - Ensure domain is proxied through Cloudflare

### Performance Issues

1. **Slow Worker Execution**
   - Monitor CPU usage in Workers Analytics
   - Check for blocking operations
   - Optimize database queries
   - Review memory usage patterns

2. **Cold Start Issues**
   - Minimize Worker bundle size
   - Avoid heavy imports in global scope
   - Use lightweight dependencies
   - Consider implementing keep-alive strategies

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

## General Performance Issues

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
