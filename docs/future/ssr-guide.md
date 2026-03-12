> **⚠️ LEGACY — Phase 2 / SSR Era**
>
> This document describes the Workers SSR architecture that is **not part of the current
> static-first V1 stack**. It is preserved for future Phase 2 reference.
> For current architecture, see [`docs/architecture.md`](../architecture.md) and
> [`docs/deployment.md`](../deployment.md).

# Server-Side Rendering (SSR) Guide

**Status:** Phase 2 / optional planning. The kit defaults to **static-first** (Astro SSG + Cloudflare Pages).

This guide explains how to configure and use server-side rendering with Cloudflare Workers in your Astro frontend.

## When to Use SSR

Consider using SSR when you need:

- Dynamic content that changes per user
- User authentication and session management
- Real-time data from APIs
- Personalized content
- SEO optimization for dynamic pages
- Edge computing capabilities

## SSR Configuration

1. **Cloudflare Workers Adapter**

   The project comes pre-configured with the Cloudflare Workers adapter:

   ```js
   // astro.config.mjs
   import { defineConfig } from 'astro/config';
   import cloudflare from '@astrojs/cloudflare';

   export default defineConfig({
     adapter: cloudflare({
       mode: 'advanced'
     }),
     output: 'server'  // Enable SSR globally
   });
   ```

2. **Wrangler Configuration**

   ```toml
   # wrangler.toml
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

3. **Per-Page Configuration**

   ```astro
   ---
   // For pages that need SSR
   export const prerender = false;

   // For static pages (overrides global SSR)
   export const prerender = true;
   ---
   ```

## Workers Runtime Features

### KV Storage Integration

```astro
---
// Access KV storage in your pages
const runtime = Astro.locals.runtime;
const sessionData = await runtime.env.SESSION.get('user-session');
---
```

### Environment Variables

```astro
---
// Access environment variables
const apiUrl = Astro.locals.runtime.env.DRUPAL_API_URL;
const response = await fetch(`${apiUrl}/node/article`);
---
```

### Request Context

```astro
---
// Access request information
const userAgent = Astro.request.headers.get('user-agent');
const clientIP = Astro.request.headers.get('cf-connecting-ip');
const country = Astro.request.cf?.country;
---
```

## Deployment Configuration

### Automated Deployment

The project includes automated Workers deployment:

```bash
# Deploy using the provided script
zsh scripts/deploy-frontend.sh

# Or deploy manually
cd astro-frontend
npx wrangler deploy
```

### Required Environment Variables

```bash
CLOUDFLARE_API_TOKEN=your_api_token
DRUPAL_API_URL=https://your-drupal-backend.com/jsonapi
NODE_ENV=production
```

### KV Namespace Setup

```bash
# Create KV namespace for sessions
npx wrangler kv namespace create "SESSION"

# Update wrangler.toml with the returned namespace ID
```

## Environment-Specific Settings

### Development

```bash
# Local development with Workers
npx wrangler dev

# Access at http://localhost:8787
```

### Staging

```bash
# Deploy to staging environment
npx wrangler deploy --env staging
```

### Production

```bash
# Deploy to production
npx wrangler deploy --env production
```

## Best Practices

1. **Start with Hybrid Rendering**
   - Use static rendering for unchanging content
   - Enable SSR only for dynamic pages
   - Leverage edge caching for better performance

2. **Performance Optimization**
   - Implement KV storage for session management
   - Use appropriate cache headers
   - Monitor Worker CPU usage and execution time

3. **Testing and Development**
   - Test locally with `npx wrangler dev`
   - Use `--remote` flag to test with live KV storage
   - Verify all dynamic routes work correctly

4. **Monitoring and Observability**
   - Enable observability in wrangler.toml
   - Monitor Worker logs in Cloudflare Dashboard
   - Set up alerts for error rates and performance

## Troubleshooting

Common SSR issues and solutions:

1. **Worker Build Errors**
   - Check `compatibility_flags` in wrangler.toml
   - Verify Node.js compatibility
   - Review build output for asset issues

2. **KV Storage Issues**
   - Verify namespace ID in wrangler.toml
   - Check KV permissions and access
   - Use `--remote` flag for local development

3. **Performance Issues**
   - Monitor Worker execution time
   - Optimize database queries
   - Implement caching strategies
   - Implement warm-up requests
   - Use appropriate caching
   - Consider static generation for popular pages

4. **Memory Issues**
   - Monitor Worker memory usage
   - Optimize large responses
   - Use streaming for large datasets

5. **Timeout Errors**
   - Adjust Worker timeout settings
   - Implement request timeouts
   - Use background tasks for long operations

See [Troubleshooting Guide](../troubleshooting.md) for more details.
