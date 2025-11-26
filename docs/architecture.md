# Architecture Overview

This document provides a high-level overview of how the Drupal + Astro starter kit components work together.

> **V1 Static-First Architecture**: This kit defaults to static site generation (SSG). Drupal runs locally as a content source, and Astro builds a fully static site deployed to Cloudflare Pages. There is no runtime dependency on Drupal in production.

## System Components

```plaintext
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Drupal Backend │────►│  Astro Build    │────►│ Cloudflare      │
│  (DDEV Local)   │     │  (Static SSG)   │     │   Pages         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
      JSON:API              getStaticPaths()        Static HTML
      at build time         generates HTML          served globally
```

The flow above shows:

1. **Drupal Backend**: Runs locally via DDEV, provides content via JSON:API
2. **Astro Build**: Fetches all content at build time, generates static HTML
3. **Cloudflare Pages**: Serves static files globally via CDN

## Static-First Benefits

- **Zero runtime dependencies**: Production site doesn't need Drupal
- **Maximum performance**: Pre-rendered HTML served from CDN edge
- **Simple hosting**: Free tier on Cloudflare Pages
- **Enhanced security**: No backend exposed to the internet
- **Reliable**: No server-side failures possible

## Development Flow

```plaintext
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Edit Content   │────►│  Build Static   │────►│  Deploy to      │
│  in Drupal      │     │  Site           │     │  Cloudflare     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
   Local DDEV            npm run build           wrangler pages deploy
```

## Component Relationships

### 1. Frontend (Astro)

- **Static output mode**: `output: 'static'` in astro.config.mjs
- **No SSR adapter**: Plain static HTML generation
- **Build-time fetching**: Content fetched from Drupal during `npm run build`
- **Cloudflare Pages hosting**: Simple static file serving

### 2. Backend (Drupal)

- **Local only**: Runs on DDEV in development
- **JSON:API**: Provides content via `/jsonapi/node/page`
- **Path aliases**: URL structure defined in Drupal, replicated in Astro routes
- **Not exposed**: No public Drupal instance needed in production

### 3. Infrastructure (Cloudflare Pages)

- **Static hosting**: Serves pre-built HTML files
- **Global CDN**: Content delivered from nearest edge location
- **Free tier**: Sufficient for most static sites
- **Custom domains**: Easy to configure

### 4. CI/CD (Optional)

For automated deployments:

1. Commit content changes (or trigger manually)
2. CI runner connects to staging Drupal
3. Runs `npm run build` 
4. Deploys to Cloudflare Pages

## Data Flow

### Local Development

```plaintext
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│  Browser    │────►│  Astro Dev  │────►│  Drupal     │
│             │     │  Server     │     │  DDEV       │
│             │     │  :4321      │     │  :80        │
└─────────────┘     └─────────────┘     └─────────────┘
                    
In dev mode, Astro fetches fresh content on each page navigation.
Hot reload works for Astro component changes.
```

### Build & Production

```plaintext
Build Time:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│  Drupal     │────►│  npm run    │────►│  dist/      │
│  JSON:API   │     │  build      │     │  static     │
│             │     │             │     │  HTML       │
└─────────────┘     └─────────────┘     └─────────────┘

Production:
┌─────────────┐     ┌─────────────┐
│             │     │             │
│  Browser    │────►│  Cloudflare │
│             │     │  Pages CDN  │
│             │     │             │
└─────────────┘     └─────────────┘

No Drupal involved at runtime!
```

## URL Routing

Drupal path aliases map directly to Astro routes:

| Drupal Alias | Astro Route | Output File |
|--------------|-------------|-------------|
| `/` | `[...slug].astro` (undefined) | `dist/index.html` |
| `/about` | `[...slug].astro` ("about") | `dist/about/index.html` |
| `/services/web` | `[...slug].astro` ("services/web") | `dist/services/web/index.html` |

## Content Modeling Conventions

- **Machine Names**: Use `field_` prefix for all custom fields
- **Path Aliases**: Required for all pages (Pathauto generates automatically)
- **Body Field**: Uses `text_with_summary` for processed HTML output

## Future: SSR Mode (V2+)

If you need server-side rendering:

1. Host Drupal publicly (or on internal network)
2. Switch Astro to `output: 'server'` with Cloudflare adapter
3. Deploy to Cloudflare Workers instead of Pages
4. Enable live content fetching at request time

This is an advanced configuration for use cases like:
- Preview mode
- Personalized content
- Very large sites (>1000 pages)
- Real-time content updates

