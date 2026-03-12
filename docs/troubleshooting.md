# Troubleshooting Guide

This guide covers common issues and their solutions for the Drupal + Astro static-first starter kit.

> **V1 Static-First**: This kit builds a static site from local Drupal content. Most runtime issues from SSR don't apply.

## Build-Time Issues

### Cannot Connect to Drupal

**Symptom**: Build fails with "Cannot connect to Drupal JSON:API"

**Solution**: Ensure DDEV is running:

```bash
cd drupal-backend
ddev start
ddev describe  # Verify status
```

### No Content in Build

**Symptom**: Build succeeds but generates no pages

**Possible Causes**:

1. No published pages in Drupal
2. DRUPAL_API_URL not set correctly

**Solution**:

```bash
# Check for published content
cd drupal-backend
ddev drush sql:query "SELECT COUNT(*) FROM node_field_data WHERE status = 1"

# Verify API URL
echo $DRUPAL_API_URL
curl -s "$DRUPAL_API_URL/node/page" | head -20
```

### Pages Missing Path Aliases

**Symptom**: Pages skipped during build with "no path alias" warning

**Solution**:

- The setup script configures the Pathauto page pattern (`pathauto.pattern.page`), so every seeded Basic page already has an alias and new Basic pages keep getting one automatically. That means you should rarely need to touch the manual alias fields for this content type.
- If a warning still appears, double-check that the node actually has `path.alias` populated (look for the alias on the edit screen or `/admin/content` list). You can regenerate it with the "Generate alias" action in the URL alias section or via `ddev drush pathauto:generate --entity-type=node --bundle=page`.
- Manual alias entry is only necessary when you add a custom content type that Pathauto does not cover yet, or when you intentionally want a different path. In those cases, edit the page, expand "URL ALIAS," type the desired path (for example `/about`), and save.

## DDEV Issues

### DDEV Not Starting

```bash
# Check Docker status
docker ps

# Restart DDEV
ddev restart

# Check service status
ddev describe
```

### Port Conflicts

```bash
# Check what's using the ports
lsof -i :80
lsof -i :443

# Modify DDEV ports in .ddev/config.yaml
router_http_port: "8080"
router_https_port: "8443"
```

### Database Issues

```bash
# Reset database
ddev delete -O
ddev start

# Check database logs
ddev logs -s db
```

## Astro Build Issues

### Node.js Version

```bash
# Check Node version (should be 20+)
node --version

# Install correct version
nvm install 20
nvm use 20
```

### Dependency Issues

```bash
# Clean install
cd astro-frontend
rm -rf node_modules package-lock.json
npm install
```

### Missing tslib

**Symptom**: `Cannot find package 'tslib' imported from @swc/helpers`

```bash
cd astro-frontend
npm install tslib
```

## Cloudflare Pages Issues

### First Deploy Fails

**Symptom**: "Project not found" error

```bash
# Create the Pages project first
npx wrangler pages project create your-project

# Then deploy
npx wrangler pages deploy ./dist --project-name=your-project
```

### Unauthorized Error

Check your API token permissions in Cloudflare Dashboard:

1. Go to My Profile → API Tokens
2. Verify token has "Cloudflare Pages:Edit" permission
3. If expired, create a new token

### Build Works Locally, Fails in CI

Cloudflare's CI cannot reach your local DDEV. Options:

1. **Build locally, commit dist/**: Not recommended for large sites
2. **Host Drupal somewhere**: Use a staging server that CI can access
3. **Manual deploys**: Build locally, then deploy with wrangler

## Environment Issues

### Missing Environment Variables

```bash
# Check .env exists
ls -la .env

# Verify critical variables
grep DRUPAL_API_URL .env
grep PROJECT_NAME .env
```

### CORS Errors

**Symptom**: Browser blocks API requests during development

The setup script configures CORS in Drupal's `services.yml`. If you still see errors:

```bash
cd drupal-backend
cat web/sites/default/services.yml | grep -A 10 "cors.config"
```

Verify `enabled: true` and `allowedOrigins` includes `http://localhost:4321`.

## JSON:API Issues

### API Returns 401/403

Anonymous access not configured properly:

```bash
cd drupal-backend
ddev drush role:perm:add anonymous 'access content'
```

### Path Aliases Not in API Response

Verify path field is included:

```bash
curl -s "http://your-project.ddev.site/jsonapi/node/page" | jq '.data[0].attributes.path'
```

Should return `{ "alias": "/about", ... }`.

## Performance Issues

### Slow Builds

For sites with many pages:

```bash
# Check page count
curl -s "$DRUPAL_API_URL/node/page" | jq '.meta.count'
```

If >100 pages, consider:
- Increasing JSON:API page limit
- Using build caching
- Upgrading to SSR for very large sites

## Getting Help

1. **Documentation**
   - [Architecture Guide](architecture.md)
   - [Deployment Guide](deployment.md)

2. **Community**
   - Astro Discord: https://astro.build/chat
   - Drupal Forums: https://drupal.org/forum
   - Cloudflare Community: https://community.cloudflare.com

3. **Debug Tips**
   - Use `npm run build --verbose` for detailed build logs
   - Check `ddev logs` for Drupal errors
   - Review `wrangler pages deployment list` for deploy history
