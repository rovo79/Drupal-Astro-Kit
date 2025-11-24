# Implementation Plan: Drupal Headless JSON:API Profile (V1 Minimal)

**Branch**: `002-drupal-api-config` | **Date**: 2025-11-18 | **Spec**: /Users/rob/Dev/Drupal_Astro_Kit/specs/002-drupal-api-config/spec.md
**Input**: Feature specification from `/specs/002-drupal-api-config/spec.md`

**Note**: Generated via Speckit plan workflow. This file will be iteratively updated through Phase 2.

## Summary

Deliver a minimal, production-conscious headless Drupal JSON:API setup that works out-of-the-box after running `./setup.sh`. V1 includes core `jsonapi`, a single `page` content type (fields: title, field_slug, field_summary, field_body), and CORS configured for `http://localhost:4321` and `https://<project>.workers.dev`. Advanced ergonomics (jsonapi_extras), performance tuning, and comprehensive security hardening are deferred to V2+.

## Technical Context

**Language/Version**: PHP 8.3 (Drupal 11), Node.js 20 (Astro/Workers dev), Bash 5+  
**Primary Dependencies**: Drupal 11 core (`jsonapi`), DDEV, Drush; Astro with `@astrojs/cloudflare` (SSR), `jsona`, `drupal-jsonapi-params`, Wrangler CLI  
**Storage**: MariaDB/PostgreSQL via DDEV for Drupal; Cloudflare KV (SESSION) for frontend session management (not directly used by this feature)  
**Testing**: Manual gates: setup verification, integration (Astro fetch → Drupal), deployment (Workers). Optional audit scripts under `/audit`  
**Target Platform**: Local DDEV for Drupal; Astro SSR on Cloudflare Workers for frontend  
**Project Type**: Decoupled web: Drupal backend + Astro frontend + Workers deployment  
**Performance Goals**: NEEDS CLARIFICATION (V1 focuses on correctness; V2+ to define p95 targets for JSON:API)  
**Constraints**: Config-driven from `.env`/PROJECT_NAME; zero manual steps beyond KV namespace ID; SSR default  
**Scale/Scope**: NEEDS CLARIFICATION (initial developer experience and sample content; production scale not specified in V1)

## Constitution Check

Gate status before Phase 0 research: PASS (no violations identified for V1 scope)

Verified against `.specify/memory/constitution.md`:

- Service boundaries respected: Drupal ⇄ Astro ⇄ Workers communicate ONLY via JSON:API and env bindings. ✅
- Config-driven: No hard-coded URLs; values derive from `.env` (`PROJECT_NAME`). Bootstrap scripts compute `http://{PROJECT_NAME}.ddev.site`. ✅
- Automation: Setup uses `setup.sh` (Ink CLI); no manual steps beyond KV namespace ID. ✅
- UX consistency: Scripts follow color-coded output and helper conventions. ✅
- Rendering: SSR default (`output: 'server'`); static pages require explicit `prerender`. ✅
- Workers build path: `wrangler.toml` expects `astro-frontend/dist/_worker.js/index.js`; no changes required in V1. ✅
- KV usage: `SESSION` KV binding present for frontend sessions; unaffected by this feature. ✅/N/A
- Quality gates: Plan includes Setup, Integration, and Deployment validation checkpoints. ✅

Re-check after Phase 1 design: Scheduled below.

Post-design re-check (Phase 1): PASS

- Data model documents a single `page` bundle with consistent field names. ✅
- OpenAPI contract documents core JSON:API endpoint only (no extras). ✅
- Quickstart uses `.env`-derived URLs and `setup.sh` workflow. ✅
- No changes to Workers build paths or KV bindings in this feature. ✅

## Project Structure

### Documentation (this feature)

```text
specs/002-drupal-api-config/
├── plan.md              # This file (Speckit plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output (OpenAPI for JSON:API endpoints)
```

### Source Code (repository root)

```text
/Users/rob/Dev/Drupal_Astro_Kit
├── astro-frontend/              # Astro SSR app (Cloudflare adapter)
│   └── src/pages/               # Includes api-check.astro, kv-check.astro
├── setup.sh                     # One-command installer (Ink CLI)
├── setup/                       # Interactive setup tool (meow + Ink + execa)
├── scripts/                     # Deploy and MCP helper scripts
├── docs/                        # Architecture, SSR, Cloudflare, CI docs
├── audit/                       # Manual audit scripts and reports
├── .specify/                    # Speckit templates, scripts, constitution
└── drupal-backend/              # Created by setup; not committed
```

**Structure Decision**: Decoupled web application with generated backend (`drupal-backend/` via setup) and committed frontend (`astro-frontend/`). Documentation and contracts live under `/specs/002-drupal-api-config/`.

## Complexity Tracking

No constitution violations requiring justification in V1.

## Cross-References

- **Quickstart**: [quickstart.md](./quickstart.md)
- **Audit Script**: [jsonapi_audit.js](../../audit/scripts/jsonapi_audit.js)
- **API Contract**: [contracts/openapi.yaml](./contracts/openapi.yaml)

