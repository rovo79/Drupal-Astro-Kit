# Implementation Plan: Static-First SSG Refactor

**Branch**: `003-static-ssg-refactor` | **Date**: 2025-11-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-static-ssg-refactor/spec.md`

## Summary

Refactor the Drupal + Astro starter kit from SSR-first (Cloudflare Workers) to **static-first** (Cloudflare Pages). The production site becomes fully static HTML with zero runtime backend dependency. Drupal runs locally via DDEV for content authoring only. Astro uses `getStaticPaths()` to generate static pages at build time from Drupal's JSON:API. Deployment targets Cloudflare Pages instead of Workers.

## Technical Context

**Language/Version**: Node.js 20+, PHP 8.3 (Drupal via DDEV)  
**Primary Dependencies**: Astro 5.x (static mode), jsona, drupal-jsonapi-params, DDEV, Wrangler CLI  
**Storage**: MariaDB via DDEV (local only), Cloudflare Pages (static hosting)  
**Testing**: Manual validation gates (Setup, Integration, Deployment)  
**Target Platform**: Cloudflare Pages (static), Local DDEV for development  
**Project Type**: Web (Drupal backend + Astro frontend)  
**Performance Goals**: <1s TTFCP on Cloudflare Pages CDN  
**Constraints**: Build-time only Drupal access, no runtime API calls, up to 100 pages  
**Scale/Scope**: Small-to-medium static sites (brochure, portfolio, docs)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Evaluation

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Code Quality & Architecture** | ⚠️ VIOLATION | SSR → Static changes the default output mode |
| **II. Testing Standards** | ✅ PASS | Manual gates remain: Setup, Integration, Deployment |
| **III. User Experience Consistency** | ✅ PASS | Ink CLI preserved, color output, progressive docs |
| **IV. Performance Requirements** | ⚠️ VIOLATION | Changing from "edge-first SSR" to "static-first" |
| **V. Operational Excellence** | ✅ PASS | Reproducible from scratch, CI/CD mirrors local |

### Violations Requiring Justification

| Violation | Constitution Says | Feature Requires | Justification |
|-----------|-------------------|------------------|---------------|
| Output Mode | `output: 'server'` globally | `output: 'static'` globally | PRD explicitly defines V1 as static-first; SSR becomes V2 optional feature. Static aligns with "no runtime dependency" goal. |
| Workers → Pages | `wrangler.toml` for Workers | `wrangler pages deploy` | Static hosting doesn't need Workers runtime; Pages is simpler and free-tier friendly. |
| KV Bindings | `SESSION` KV required | No KV bindings | Static sites have no server-side session handling; removes complexity. |

**Constitution Amendment Required**: Yes. After V1 ships, constitution Section IV should be updated to acknowledge static-first as the default, with SSR as an opt-in upgrade path.

## Project Structure

### Documentation (this feature)

```text
specs/003-static-ssg-refactor/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (JSON:API contract)
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Web application structure (Drupal backend + Astro frontend)

drupal-backend/           # Created by setup CLI
├── web/
│   ├── modules/          # Custom modules (if any)
│   └── sites/default/
│       └── settings.php  # DDEV-configured
├── config/sync/          # Exported Drupal config (content type, pathauto, CORS)
└── composer.json

astro-frontend/           # Created by setup CLI
├── src/
│   ├── pages/
│   │   └── [...slug].astro   # Dynamic route from Drupal aliases
│   ├── lib/
│   │   └── drupal.ts         # JSON:API client (jsona + pagination)
│   └── layouts/
│       └── Base.astro        # Shared layout
├── astro.config.mjs          # output: 'static', no adapter
├── package.json
└── .env                      # API_BASE_URL from setup

setup/                    # Interactive CLI (existing)
├── cli.js
├── ui.js                 # Ink-based UI (modified for static)
└── package.json

scripts/
├── deploy-frontend.sh    # Updated: wrangler pages deploy
└── seed-content.sh       # NEW: Creates sample pages via Drush

docs/                     # Updated for static-first
├── architecture.md
├── deployment.md         # Updated: Pages instead of Workers
└── troubleshooting.md
```

**Structure Decision**: Preserves existing two-project structure (Drupal backend + Astro frontend). Removes Workers-specific files (`wrangler.toml` for Workers, KV bindings). Setup CLI continues to scaffold both projects.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Static output mode | PRD defines V1 as static-first for zero-runtime simplicity | SSR adds Workers complexity, hosting cost, and runtime debugging |
| Remove KV bindings | No server-side sessions in static site | Keeping unused bindings confuses users and adds config burden |
| Pages vs Workers | Static hosting is simpler, cheaper, faster for brochure sites | Workers runtime unnecessary for pre-built HTML |
