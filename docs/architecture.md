# Architecture Overview

This document provides a high-level overview of how the Drupal + Astro starter kit components work together.

## System Components

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Drupal Backend │────►│  Astro Frontend │────►│  Cloudflare CDN │
│  (DDEV)         │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        ▲                       ▲                        ▲
        │                       │                        │
        │                       │                        │
        ▼                       ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  GitHub Actions │     │  Cloudflare     │     │  Custom Domain  │
│  (CI/CD)        │     │  Workers        │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

The flow above shows:

- Drupal Backend provides content and API endpoints
- Astro Frontend consumes the API and generates pages
- Cloudflare CDN serves the frontend to users
- Supporting services (GitHub Actions, Workers, Custom Domain) enhance the core functionality

## Development Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│  Local Dev  │────►│  Staging    │────►│ Production  │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Component Relationships

### 1. Frontend (Astro)

- Serves static content through Cloudflare Pages
- Can use SSR via Cloudflare Workers when needed
- Communicates with Drupal backend via API
- Benefits from Cloudflare's global CDN

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

```
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

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────────┐
│             │     │             │     │                         │
│  User       │────►│  Frontend   │     │      Backend Options    │
│  Request    │     │  (Astro)    │     │                         │
│             │     │  Pages      │     │                         │
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
│  CDN        │     │  Cloudflare Services                    │
│  Cache      │     │  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│             │     │  │ Workers │ │  D1 DB  │ │   KV    │   │
└─────────────┘     │  └─────────┘ └─────────┘ └─────────┘   │
                    │  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
                    │  │   R2    │ │ Workers │ │ Vector  │   │
                    │  │ Storage │ │   AI    │ │  Store  │   │
                    │  └─────────┘ └─────────┘ └─────────┘   │
                    │  ┌─────────────────────────┐           │
                    │  │      Drupal Backend     │           │
                    │  │    (Enterprise Only)    │           │
                    │  └─────────────────────────┘           │
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

```
