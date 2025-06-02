# Architecture Overview

This document provides a high-level overview of how the Drupal + Astro starter kit components work together.

## System Components

```plaintext
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Drupal Backend │────►│  Astro Frontend │────►│ Cloudflare Edge │
│  (DDEV)         │     │  (SSR/Static)   │     │   (Workers)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        ▲                       ▲                        ▲
        │                       │                        │
        │                       │                        │
        ▼                       ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  GitHub Actions │     │  Cloudflare     │     │  Custom Domain  │
│  (CI/CD)        │     │  KV Storage     │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

The flow above shows:

- Drupal Backend provides content and API endpoints
- Astro Frontend consumes the API and generates pages with SSR capabilities
- Cloudflare Workers serve the frontend globally with edge computing
- Supporting services (GitHub Actions, KV Storage, Custom Domain) enhance the core functionality

## Development Flow

```plaintext
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│  Local Dev  │────►│  Staging    │────►│ Production  │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Component Relationships

### 1. Frontend (Astro)

- Deploys to Cloudflare Workers with SSR capabilities
- Supports both static generation and server-side rendering
- Communicates with Drupal backend via JSON:API
- Benefits from Cloudflare's global edge network
- Integrates with KV storage for session management
- Leverages edge computing for dynamic content

### 2. Backend (Drupal)

- Runs on DDEV in development
- Deployed to production via DDEV
- Provides API endpoints for frontend
- Handles content management and business logic

### 3. Infrastructure (Cloudflare)

- Pages: Hosts static frontend assets
- Workers: Optional SSR and API routes
- CDN: Global content delivery
- Security: SSL, WAF, DDoS protection

### 4. CI/CD (GitHub Actions)

- Automated testing
- Frontend deployment to Cloudflare
- Backend deployment via DDEV
- Environment-specific configurations

## Data Flow

### Local Development

```plaintext
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│  User       │────►│  Frontend   │     │  Backend    │
│  Request    │     │  (Astro)    │     │  (Drupal)   │
│             │     │  localhost  │     │  DDEV       │
└─────────────┘     └─────────────┘     └─────────────┘
        │                 │                    ▲
        │                 │                    │
        │                 └────────────────────┘
        │                     Direct API
        │                     Requests
        │
        ▼                 ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│  No CDN     │     │  No SSR     │     │  Database   │
│  in Dev     │     │  in Dev     │     │  Local      │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Production Environment

```plaintext
┌─────────────┐     ┌─────────────┐     ┌─────────────────────────┐
│             │     │             │     │                         │
│  User       │────►│  Frontend   │────►│      Backend Options    │
│  Request    │     │  (Workers)  │     │                         │
│             │     │  SSR/Static │     │                         │
└─────────────┘     └─────────────┘     └─────────────────────────┘
        │                 │                    ▲
        │                 │                    │
        │                 └────────────────────┘
        │                     API Requests
        │                     via Workers
        │
        ▼                 ▼                    ▼
┌─────────────┐     ┌─────────────────────────────────────────┐
│             │     │                                         │
│  Edge       │     │  Cloudflare Services                    │
│  Cache      │     │  ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│             │     │  │ Workers │ │  D1 DB  │ │   KV    │    │
└─────────────┘     │  └─────────┘ └─────────┘ └─────────┘    │
                    │  ┌─────────┐ ┌─────────┐ ┌─────────┐    │
                    │  │   R2    │ │ Workers │ │ Vector  │    │
                    │  │ Storage │ │   AI    │ │  Store  │    │
                    │  └─────────┘ └─────────┘ └─────────┘    │
                    │  ┌─────────────────────────┐            │
                    │  │      Drupal Backend     │            │
                    │  │    (External/Cloud)     │            │
                    │  └─────────────────────────┘            │
                    └─────────────────────────────────────────┘
```

The data flow above shows:

1. **Local Development**:
   - Direct communication between Astro and Drupal
   - No CDN or Workers involved
   - All services run locally via DDEV
   - Database is local

2. **Production Environment**:
   - Frontend is served via Cloudflare Pages
   - API requests are handled by Cloudflare Workers
   - Workers can connect to various Cloudflare services:
     - **D1**: SQL database
     - **KV**: Key-value store
     - **R2**: Object storage
     - **Workers AI**: AI/ML capabilities
     - **Vector Store**: Vector database
     - **Durable Objects**: Stateful compute
   - Optional Drupal backend for enterprise needs
   - All services benefit from Cloudflare's global network

3. **Key Differences**:
   - Local: Direct API calls to Drupal
   - Production: Flexible backend options via Workers
   - Local: No CDN caching
   - Production: Full CDN caching
   - Local: No SSR
   - Production: Optional SSR via Workers

## Deployment Flow

```plaintext
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│   GitHub    │────►│   Build     │────►│  Cloudflare │
│   Push      │     │   Process   │     │   Workers   │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
        │                 │                     │
        │                 │                     │
        ▼                 ▼                     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│  CI/CD      │     │  Astro      │     │  Global     │
│  Pipeline   │     │  Build      │     │  Edge       │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

This deployment flow shows how code moves from development to production through the Cloudflare Workers platform.
