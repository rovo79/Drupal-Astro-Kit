# Drupal_Astro_Kit

## What This Is

A starter kit for developers who want to spin up a Drupal-backed static site quickly. Running `./setup.sh` generates a local Drupal 11 backend (in DDEV) and an Astro frontend, builds static HTML from Drupal JSON:API at build time, and deploys to Cloudflare Pages. The repo is a generator — the source of truth is the setup scripts and templates, not the generated output.

## Core Value

A developer can go from zero to a deployed static site backed by Drupal in one setup command, with a clean separation between content authoring (Drupal), static rendering (Astro), and hosting (Cloudflare Pages).

## Requirements

### Validated

- ✓ Generator creates local Drupal 11 backend via DDEV — existing
- ✓ Generator creates Astro frontend with JSON:API integration — existing
- ✓ Astro builds static HTML from Drupal JSON:API at build time — existing
- ✓ Drupal aliases drive Astro route generation — existing
- ✓ Static output deploys to Cloudflare Pages — existing
- ✓ Setup orchestrated by single `./setup.sh` command — existing
- ✓ Audit toolkit validates setup, API, build, and deploy — existing

### Active

- [ ] Repo identity is unambiguous: static-first starter kit, not a platform or SSR framework
- [ ] Docs have hard boundaries between "supported V1" and "future/reference"
- [ ] Publishing workflow (rebuild-to-publish coupling) is documented as first-class behavior
- [ ] Build-source strategy declares local-first as the default, CI/hosted as optional advanced

### Out of Scope

- Workers SSR / edge rendering — premature; no concrete need yet
- Multi-environment strategy (staging/preview Drupal) — defer until local-first is tight
- Webhook-driven rebuild orchestration — adds complexity without clear value for V1
- Content API contract formalization — defer until content model grows beyond simple pages
- Build observability / freshness timestamps — useful but not part of tightening pass
- Real-time preview for editors — requires hosted Drupal and runtime rendering

## Context

The repo has drifted into carrying multiple identities: starter kit, generator, reference architecture, audit framework, and future SSR roadmap. A detailed platform review identified that the runtime architecture is fundamentally sound (static-first, conservative Cloudflare usage, clean separation of concerns) but the repo's messaging, docs, and structure blur what is supported versus aspirational.

The primary risk is not technical — it is conceptual overhead and operational confusion. The review surfaced a key tradeoff that must be stated plainly: **content publishing is coupled to frontend rebuild/deploy, and that is a deliberate product decision, not an implementation detail.**

Legacy SSR-era docs (`docs/ssr-guide.md`, `docs/cloudflare-setup.md`, `docs/github-actions.md`) already have banners marking them as Phase 2, but they still sit near the happy path and create ambiguity.

The codebase map (`.planning/codebase/`) captures the current technical state in detail.

### Key architecture facts

- **Generator repo:** Source of truth is `setup/`, `templates/`, `scripts/`, `specs/`, `docs/`
- **Generated output:** `drupal-backend/` and `astro-frontend/` are gitignored
- **Default operating model:** Local Drupal (DDEV) + local Astro build + manual deploy to Pages
- **Static-first:** Astro `output: 'static'`, no SSR, no Workers runtime
- **Build-time dependency:** Frontend build requires Drupal JSON:API to be reachable

## Constraints

- **Scope:** Tightening and clarification only — no new runtime capabilities
- **Identity:** Static-first starter kit for developers, not an editorial platform
- **Build source:** Local-first is the V1 default; CI/hosted is optional advanced
- **Generated output:** Changes go in source-of-truth files (setup/, templates/, scripts/), not in generated dirs
- **Audience:** Developer who wants to spin up a Drupal-backed static site quickly

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Static-first is the V1 default | SSR adds complexity without concrete need; static Pages is simple and debuggable | — Pending |
| Local-first build source | Local DDEV is what actually works today; CI/hosted requires hosted Drupal that isn't part of V1 | — Pending |
| Rebuild-to-publish is a feature, not a bug | Deliberate tradeoff: simplicity over real-time freshness; must be documented plainly | — Pending |
| No new capabilities in this pass | The architecture is sound; the problem is clarity and messaging, not missing features | — Pending |

---
*Last updated: 2026-03-11 after initialization*
