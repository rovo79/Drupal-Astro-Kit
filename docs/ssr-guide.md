# Server-Side Rendering (SSR) Guide

This guide explains how to enable and configure server-side rendering in your Astro frontend.

## When to Use SSR

Consider enabling SSR when you need:

- Dynamic content that changes per user
- User authentication
- Real-time data
- Personalized content
- API routes

## Enabling SSR

1. **Install Cloudflare Adapter**

   ```bash
   npx astro add cloudflare
   ```

2. **Update Configuration**

   ```js
   // astro.config.mjs
   import { defineConfig } from 'astro/config';
   import cloudflare from '@astrojs/cloudflare';

   export default defineConfig({
     adapter: cloudflare(),
     output: 'server'  // Enable SSR
   });
   ```

3. **Per-Page SSR**

   ```astro
   ---
   // Add to pages that need SSR
   export const prerender = false;
   // Your dynamic page code here
   ---
   ```

## Deployment Configuration

### GitHub Actions

Update your workflow file to support SSR:

```yaml
env:
  PROJECT_NAME: ${{ github.event.repository.name }}
  ENABLE_SSR: false  # Set to true to enable SSR

jobs:
  frontend:
    steps:
      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          command: ${{ env.ENABLE_SSR == 'true' && 'deploy' || 'pages deploy' }}
```

### Required Secrets

```yaml
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_WORKER_NAME  # Optional, defaults to PROJECT_NAME
```

## Environment-Specific Settings

### Development

```yaml
ENABLE_SSR: false
CLOUDFLARE_ENVIRONMENT: development
```

### Staging

```yaml
ENABLE_SSR: true
CLOUDFLARE_ENVIRONMENT: staging
```

### Production

```yaml
ENABLE_SSR: true
CLOUDFLARE_ENVIRONMENT: production
```

## Best Practices

1. **Start Static**
   - Begin with static rendering
   - Enable SSR only when needed
   - Use static pages for content that doesn't change

2. **Performance**
   - Implement caching strategies
   - Monitor Worker usage and costs
   - Use appropriate caching headers

3. **Testing**
   - Test SSR locally before enabling
   - Verify all dynamic routes
   - Check error handling

4. **Monitoring**
   - Set up error tracking
   - Monitor response times
   - Track Worker invocations

## Troubleshooting

Common SSR issues and solutions:

1. **Cold Starts**
   - Implement warm-up requests
   - Use appropriate caching
   - Consider static generation for popular pages

2. **Memory Issues**
   - Monitor Worker memory usage
   - Optimize large responses
   - Use streaming for large datasets

3. **Timeout Errors**
   - Adjust Worker timeout settings
   - Implement request timeouts
   - Use background tasks for long operations

See [Troubleshooting Guide](troubleshooting.md) for more details.
