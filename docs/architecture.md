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
   JSON:API + Linkset       getStaticPaths()        Static HTML
      at build time         generates HTML          served globally
```

The flow above shows:

1. **Drupal Backend**: Runs locally via DDEV, provides page content via JSON:API and navigation via Linkset
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
- **Optional media images**: Can expose Media-backed `field_hero_image` relationships plus derivative URLs from `jsonapi_image_styles`
- **Linkset**: Provides menu trees via `/system/menu/<menu-name>/linkset`
- **Path aliases**: URL structure defined in Drupal, replicated in Astro routes
- **Not exposed**: No public Drupal instance needed in production

### 3. Infrastructure (Cloudflare Pages)

- **Static hosting**: Serves pre-built HTML files
- **Global CDN**: Content delivered from nearest edge location
- **Free tier**: Sufficient for most static sites
- **Custom domains**: Easy to configure

### 4. CI/CD (Optional Advanced)

> The V1 operating model is local-first. CI/CD is optional for teams that need automated deploys.

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
                    
In dev mode, Astro fetches fresh page and menu data on each page navigation.
Hot reload works for Astro component changes.
```

### Build & Production

```plaintext
Build Time:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│  Drupal     │────►│  npm run    │────►│  dist/      │
│  JSON:API + │     │  build      │     │  static     │
│  Linkset    │     │             │     │  HTML       │
│             │     │             │     │             │
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

## Page Composition Strategy

For landing pages, homepages, and most listing pages, the default composition flow is:

```text
Astro page/template
-> calls the Drupal data layer
-> Drupal JSON:API queries entity collections directly
-> Astro assembles the final page
```

Not:

```text
Astro page/template
-> consumes a Drupal View by default
```

This kit treats Astro as the owner of layout, section ordering, and presentation. Drupal owns the content model and exposes it through core JSON:API resources. In practice, that means Astro should usually fetch entity collections directly with JSON:API filters, sorting, pagination, sparse fieldsets, and includes, then compose the page in the frontend.

### Default: direct JSON:API queries

Use direct JSON:API collection queries when:

- Astro owns the page composition
- The data maps cleanly to Drupal entity types and bundles
- Section ordering and layout belong in the frontend
- You want explicit, predictable contracts that normalize cleanly in Astro

Typical examples:

```text
Homepage hero/supporting sections
-> fetch featured content directly from node/product collections

Collections page
-> fetch collection entities directly

Guides or category pages
-> fetch filtered entity collections directly
```

For example, a homepage can stay frontend-owned while Drupal remains the source of truth for content flags:

```text
Section 1: featured collections
-> filter collection nodes by a homepage flag

Section 2: featured products
-> filter products by featured=true and sort by weight

Section 3: editor picks
-> filter products by editor_pick=true

Section 4: featured guides
-> filter guides by featured=true
```

### Exception: View-backed feeds

Use a Drupal View-backed JSON endpoint only when the extra Drupal-side query layer is deliberate:

- Editors or admins need to control the feed logic in Drupal
- The query is complex enough that centralizing it in Drupal is worth the extra abstraction
- Multiple frontends or consumers should share the exact same curated result set

If a View is used, it should be treated as a targeted exception for a reusable feed, not the primary population mechanism for ordinary landing pages.

### Search is its own concern

Search should be evaluated separately from page composition:

- Simple browsing can start with direct JSON:API filtering
- Faceted or relevance-driven search usually deserves a dedicated Search API-based decoupled endpoint

That keeps homepage and listing-page architecture simple while leaving room for a more capable search backend later.

## URL Routing

Drupal path aliases map directly to Astro routes:

| Drupal Alias | Astro Route | Output File |
|--------------|-------------|-------------|
| `/` | `index.astro` | `dist/index.html` |
| `/about` | `[...slug].astro` ("about") | `dist/about/index.html` |
| `/services/web` | `[...slug].astro` ("services/web") | `dist/services/web/index.html` |

## Content Modeling Conventions

- **Machine Names**: Use `field_` prefix for all custom fields
- **Path Aliases**: `pathauto.pattern.page` ensures Basic pages (the seeded content type) get an alias during setup and on every save; manual alias entry is only needed for other content types or when you want a custom override.
- **Body Field**: Uses `text_with_summary` for processed HTML output
- **Images in decoupled builds**: Prefer Media entity references such as `field_hero_image`, then include related Media/File resources in JSON:API so Astro can render original and styled image URLs at build time

## Content Updates

- **Existing content**: While running `npm run dev`, edit pages or menu labels in Drupal and refresh to see updated HTML; the dev server fetches fresh JSON:API and Linkset output on navigation.
- **New routes**: When you add a new path alias (a new page or custom alias), rerun `npm run build` so Astro can regenerate the static HTML that picks up the new route.

For a full walkthrough of the publishing workflow and why rebuild-to-publish is deliberate, see [Publishing Workflow](publishing.md).

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

## References

- [Drupal JSON:API module](https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module)
- [Drupal JSON:API filtering](https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module/filtering)
- [JSON:API Views module](https://www.drupal.org/project/jsonapi_views)
