# Feature Specification: Static-First SSG Refactor

**Feature Branch**: `003-static-ssg-refactor`  
**Created**: November 26, 2025  
**Status**: Clarified  
**Input**: User description: "Refactor starter kit from SSR-first to static-first architecture: Local-only Drupal CMS, static Astro frontend with getStaticPaths, Cloudflare Pages deployment, one-command bootstrap CLI"

## Overview

This feature refocuses the Drupal + Astro starter kit from SSR-first (Cloudflare Workers) to **static-first** (Cloudflare Pages). The production site will be fully static HTML requiring no runtime backend. Drupal runs locally via DDEV for content authoring only. Astro generates static pages at build time. SSR becomes optional future functionality.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One-Command Project Setup (Priority: P1)

A Drupal developer wants to start a new decoupled project without complex DevOps. They clone the repository, run a single setup command, and get a fully configured local development environment with Drupal backend and Astro frontend ready to use.

**Why this priority**: This is the entry point for all users. Without a working setup flow, nothing else matters. It directly addresses the PRD's goal of "one-command bootstrap."

**Independent Test**: Can be fully tested by cloning the repo to a fresh machine, running `./setup.sh`, and verifying both Drupal and Astro are running with sample content.

**Acceptance Scenarios**:

1. **Given** a fresh clone of the repository, **When** the user runs `./setup.sh`, **Then** an interactive CLI prompts for project name, admin credentials, and creates both Drupal and Astro projects
2. **Given** setup completes successfully, **When** the user visits the DDEV URL, **Then** Drupal admin is accessible with JSON:API enabled
3. **Given** setup completes successfully, **When** the user runs the Astro dev server, **Then** sample pages render content from Drupal

---

### User Story 2 - Local Content Authoring (Priority: P1)

An editor wants to create and manage content in a familiar Drupal interface. They log into local Drupal, create pages with the default "Page" content type, set URL aliases, and the content becomes available via JSON:API for the Astro build.

**Why this priority**: Content authoring is the core value proposition—using Drupal as a local CMS without hosting complexity. This enables the decoupled workflow.

**Independent Test**: Can be tested by creating a new page in Drupal, setting an alias, then fetching `/jsonapi/node/page` to verify content is exposed.

**Acceptance Scenarios**:

1. **Given** Drupal is running locally, **When** an editor creates a new page with title and body, **Then** the content appears in JSON:API response
2. **Given** a page has a URL alias set (e.g., `/about`), **When** querying JSON:API, **Then** the alias path is included in the response
3. **Given** multiple pages exist, **When** an editor updates content, **Then** the changes reflect immediately in JSON:API responses

---

### User Story 3 - Static Site Build (Priority: P1)

A developer wants to generate a production-ready static site from Drupal content. They run a build command, and Astro fetches all content from Drupal's JSON:API, generates static HTML pages using URL aliases as routes, and outputs everything to a `dist/` folder.

**Why this priority**: This is the core technical differentiator—building static pages at build time means zero runtime dependency on Drupal.

**Independent Test**: Can be tested by running `npm run build` and verifying `dist/` contains HTML files matching Drupal page aliases.

**Acceptance Scenarios**:

1. **Given** Drupal has pages with aliases `/about` and `/contact`, **When** the Astro build runs, **Then** `dist/about/index.html` and `dist/contact/index.html` are generated
2. **Given** a page body contains formatted content, **When** the build completes, **Then** the HTML correctly renders the body content
3. **Given** Drupal is unreachable during build, **When** the build attempts to run, **Then** it fails with a clear error message indicating the API is unavailable

---

### User Story 4 - Cloudflare Pages Deployment (Priority: P2)

A developer wants to deploy their static site to production. They run a deploy command that uploads the `dist/` folder to Cloudflare Pages. The site goes live without requiring Drupal to be running.

**Why this priority**: Deployment is the final step in the workflow. While critical, it depends on successful build completion (P1 stories).

**Independent Test**: Can be tested by deploying to Cloudflare Pages and accessing the live URL to verify pages load correctly.

**Acceptance Scenarios**:

1. **Given** a successful Astro build with `dist/` folder, **When** the deploy script runs, **Then** the site deploys to Cloudflare Pages
2. **Given** the site is deployed, **When** a user visits the production URL, **Then** all pages load as static HTML without backend calls
3. **Given** Drupal is completely offline, **When** users access the deployed site, **Then** all pages remain accessible and functional

---

### User Story 5 - Development Workflow (Priority: P2)

A developer wants to iterate on their frontend while seeing live content changes. They run the Astro dev server, which fetches content from local Drupal. Changes to Astro components reflect immediately; content changes in Drupal require a page refresh.

**Why this priority**: A smooth development experience accelerates adoption but isn't blocking for the core static-first flow.

**Independent Test**: Can be tested by running `npm run dev`, editing an Astro component, and verifying hot reload works while Drupal content is displayed.

**Acceptance Scenarios**:

1. **Given** both Drupal and Astro dev server are running, **When** a developer edits an Astro component, **Then** changes appear immediately via hot reload
2. **Given** the dev server is running, **When** content is updated in Drupal, **Then** refreshing the browser shows updated content
3. **Given** CORS is properly configured, **When** the Astro dev server fetches from Drupal, **Then** no CORS errors occur

---

### Edge Cases

- What happens when Drupal has no content (empty site)? Build should complete with an empty `dist/` or homepage only, with a warning message.
- How does the system handle pages without URL aliases? Pages without aliases should be skipped during build with a warning logged.
- What happens when JSON:API returns paginated results? The build must fetch all pages of results, not just the first page.
- How does the build handle special characters in aliases (e.g., `/über-uns`)? URL encoding must be handled correctly for valid file paths.
- What happens if two pages have conflicting aliases? Build should fail with clear error identifying the conflict.
- How is the homepage handled? The homepage (`/`) is a Drupal page with alias `/` using the standard Page content type, rendered via the same `[...slug].astro` route.

## Requirements *(mandatory)*

### Functional Requirements

**Setup & Configuration**

- **FR-001**: Setup CLI MUST prompt for project name and use it to configure DDEV site name, environment variables, and default URLs
- **FR-002**: Setup CLI MUST install Drupal with JSON:API and Pathauto modules enabled by default
- **FR-003**: Setup CLI MUST create a default "Page" content type with title, body, and URL alias support
- **FR-004**: Setup CLI MUST configure CORS on Drupal to allow requests from Astro dev server (localhost:4321)
- **FR-005**: Setup CLI MUST generate environment file with API base URL pointing to local DDEV site
- **FR-006**: Setup CLI MUST scaffold Astro project with static output mode configured
- **FR-006a**: Setup CLI MUST seed sample content: Homepage (alias `/`), About page (alias `/about`), Contact page (alias `/contact`)
- **FR-006b**: Starter kit MUST NOT include SSR artifacts (Cloudflare Workers config, KV bindings, SSR adapter) in V1

**Content Authoring**

- **FR-007**: Drupal MUST expose page content including body and path alias via JSON:API
- **FR-008**: Drupal MUST expose all published pages without authentication requirements for JSON:API read access
- **FR-009**: Drupal MUST include URL alias path in JSON:API responses for routing

**Static Build**

- **FR-010**: Astro MUST use `getStaticPaths()` to generate routes from Drupal content at build time
- **FR-011**: Astro MUST use Drupal URL aliases as the generated page paths
- **FR-012**: Astro MUST output static HTML files only (no server-side rendering code)
- **FR-013**: Build process MUST fail clearly if Drupal JSON:API is unreachable
- **FR-014**: Build process MUST handle pagination and fetch all content, not just first page

**Deployment**

- **FR-015**: Deploy script MUST upload `dist/` folder to Cloudflare Pages
- **FR-016**: Deployed site MUST function without any runtime API calls
- **FR-017**: Deploy process MUST NOT require Drupal to be running

**Developer Experience**

- **FR-018**: Dev server MUST fetch fresh content from Drupal on page navigation/refresh
- **FR-019**: Documentation MUST clearly state this is a static-only V1 (no SSR)
- **FR-020**: Example `[...slug].astro` route MUST be included demonstrating the pattern

### Key Entities

- **Page (Drupal)**: Content entity with title, body (formatted text, HTML sanitized by Drupal), and path alias. Represents authored content that becomes static pages.
- **Static Route (Astro)**: Generated from Drupal pages using aliases. Each Drupal page with an alias becomes one static HTML file. Body HTML is rendered directly without re-sanitization.
- **Build Manifest**: The collection of all routes Astro generates from Drupal content. Used to create the `dist/` output.

## Assumptions

- Users have DDEV installed or are willing to install it
- Users have Node.js 20+ installed
- Users have a Cloudflare account for Pages deployment
- Single content type (Page) is sufficient for V1; additional types are future scope
- Content is in a single language (multi-language is future scope)
- Users accept that content updates require a rebuild and redeploy
- V1 targets sites with up to 100 pages; larger sites may need build optimization in future versions

## Clarifications

### Session 2025-11-26

- Q: How should the homepage route (`/`) be handled? → A: Homepage is a special Drupal page with alias `/` that uses the same Page content type
- Q: What is the maximum expected content volume for V1? → A: Up to 100 pages (typical small-to-medium sites)
- Q: How should Drupal's rich text HTML be rendered in Astro? → A: Render Drupal HTML as-is (trust Drupal's sanitization)
- Q: What sample content should be seeded during setup? → A: Homepage + 2 sample pages (About `/about`, Contact `/contact`)
- Q: What should happen to existing SSR-related files/config? → A: Remove all SSR artifacts from V1 (Workers config, KV bindings, SSR adapter)

## Out of Scope (V1)

Per PRD, these are explicitly excluded:

- Server-side rendering (SSR) as default mode
- Live JSON:API calls during runtime
- Publicly hosted Drupal backend
- Preview mode for draft content
- Webhook-based incremental builds
- Edge caching / cache tag invalidation
- Multi-language routing
- Authentication on the frontend

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can go from clone to deployed static site in under 30 minutes
- **SC-002**: Setup process completes successfully in a single command with no manual intervention required beyond prompts
- **SC-003**: Built site loads pages in under 1 second on Cloudflare Pages (time to first contentful paint)
- **SC-004**: Deployed site remains fully functional with Drupal completely offline
- **SC-005**: 100% of Drupal pages with aliases are correctly built as static HTML files
- **SC-006**: Build process fails with actionable error message when Drupal is unreachable
- **SC-007**: README provides complete quick-start that new users can follow without external documentation
- **SC-008**: Zero configuration required beyond setup prompts for a working static deployment
