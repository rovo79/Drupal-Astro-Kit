# Implementation Plan: Project Audit & Optimization

**Branch**: `001-project-audit-optimization` | **Date**: 2025-11-07 | **Spec**: ./spec.md
**Input**: Feature specification from `./spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Audit the existing Drupal (DDEV) + Astro (SSR) + Cloudflare Workers stack to validate that setup automation, rendering behavior, KV binding, CI/CD pipeline, and documentation conform to project constitution. Produce structured findings and optimization recommendations without introducing breaking changes. Approach: perform scripted/manual validation passes, capture metrics (time-to-setup, SSR parity checks, JSON:API fetch reliability), and outline remediation tasks for drift or inefficiencies.

## Technical Context

**Language/Version**: Bash (automation scripts), Node.js 20 (Astro + Workers dev), PHP 8.3 (Drupal via DDEV)  
**Primary Dependencies**: Astro (SSR, Cloudflare adapter), Drupal 11 (JSON:API), jsona, drupal-jsonapi-params, Wrangler CLI, DDEV, Ink + execa (setup CLI)  
**Storage**: Drupal DB (MariaDB/PostgreSQL via DDEV internal), Cloudflare KV (SESSION)  
**Testing**: Manual gates (Setup, Integration, Deployment); future potential for Playwright + Drush tests (NEEDS CLARIFICATION: adopt automated tests now or defer?)  
**Target Platform**: Local dev (macOS, Docker) + Cloudflare Workers global edge  
**Project Type**: Decoupled web (headless CMS backend + SSR edge frontend)  
**Performance Goals**: Fast setup (<10 min), SSR parity (no environment divergence), low cold-start latency for Worker (NEEDS CLARIFICATION: capture baseline TTFB target)  
**Constraints**: Predictable build output path; KV availability; no hard-coded URLs; minimal dependency overhead  
**Scale/Scope**: Starter kit (single project) optimizing developer experience, not high user volume yet  

Unresolved clarifications flagged for Phase 0 research:

1. Automated test adoption scope (Playwright / Drush) timeline.
2. Baseline SSR performance metric (e.g., p95 TTFB target).
3. Extent of KV usage (sessions only vs. caching layer expansion).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The following MUST be verified against `.specify/memory/constitution.md`:

- Service boundaries respected: Drupal ⇄ Astro ⇄ Workers communicate ONLY via JSON:API and env bindings.
- Config-driven: No hard-coded URLs; all values come from `.env` and derive from `PROJECT_NAME`.
- Automation: Setup flow uses `setup.sh` (Ink CLI); no extra manual steps beyond KV namespace ID.
- UX consistency: Scripts print color-coded status and actionable recovery steps.
- Rendering: SSR default (`output: 'server'`); static pages MUST justify `export const prerender = true`.
- Workers build path: If changing Astro output, update `wrangler.toml` `main` and `[assets]` accordingly.
- KV usage: `SESSION` KV binding present in `wrangler.toml` and used appropriately.
- Quality gates: Plan includes checkpoints for Setup, Integration, and Deployment validation.

Re-check after Phase 1 design artifacts:

- Status: PASS (docs-only changes). No cross-layer coupling introduced; all new references remain config-driven and align with setup tooling.
- Deferrals: Actual `wrangler.toml` validation and KV namespace `id` availability occur post-setup execution.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
drupal-backend/        # DDEV managed Drupal 11 backend (created by setup)
astro-frontend/        # Astro SSR frontend (created by setup)
scripts/               # Automation scripts (deployment, setup)
specs/001-project-audit-optimization/  # Feature docs & outputs
.specify/memory/       # Constitution & agent memory
wrangler.toml          # Workers config (root-level)
.env / .env.example    # Environment configuration
```

**Structure Decision**: Decoupled backend (`drupal-backend/`) and frontend (`astro-frontend/`) with root-level infra configs (`wrangler.toml`, `.env`). Audit artifacts live under `specs/001-project-audit-optimization/`.

## Complexity Tracking

No violations anticipated. If later automation introduces performance benchmarking scripts or KV caching beyond sessions, justification will be added here (e.g., need for persistent performance log).
