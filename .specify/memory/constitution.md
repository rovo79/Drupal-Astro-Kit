<!--
Sync Impact Report
- Version change: N/A → 1.0.0
- Modified principles: (initial adoption)
	• Code Quality & Architecture
	• Testing Standards
	• User Experience Consistency
	• Performance Requirements
	• Operational Excellence
- Added sections:
	• Additional Constraints & Performance Standards
	• Development Workflow & Quality Gates
- Removed sections: None
- Templates requiring updates:
	• .specify/templates/plan-template.md → ✅ updated (Constitution Check gates added)
	• .specify/templates/spec-template.md → ✅ aligned (no changes required)
	• .specify/templates/tasks-template.md → ✅ aligned (no changes required)
	• .specify/templates/commands/*.md → ⚠ pending (directory not present)
- Deferred TODOs: None
-->

# Drupal_Astro_Kit Constitution

## Core Principles

### I. Code Quality & Architecture (NON-NEGOTIABLE)

- Each layer (Drupal, Astro, Workers) MUST own its responsibilities; cross-layer communication ONLY via defined contracts (Drupal JSON:API, environment bindings in Workers/Astro).
- Configuration MUST be driven by `.env` (copied from `.env.example`); project URLs and API endpoints derive from `PROJECT_NAME` consistently.
- Automation is preferred over manual steps. The interactive CLI (`setup.sh` → `setup/cli.js` → `setup/ui.js`) MUST remain the default path. Manual edits are limited to Cloudflare KV namespace ID.

Rationale: Clear boundaries and automation reduce regressions, simplify onboarding, and keep docs in sync with code.

### II. Testing Standards

- The project currently follows MANUAL validation with THREE gates: (1) Setup verification (DDEV site loads), (2) Integration verification (Astro fetches Drupal JSON:API), (3) Deployment verification (Workers endpoint responds).
- Local dev behavior (`npm run dev`) SHOULD match Workers dev (`npx wrangler dev --remote`) to ensure parity, leveraging `compatibility_flags = ["nodejs_compat"]`.
- KV interactions SHOULD be exercised against live KV during dev using `--remote`.

Rationale: Aligns with existing docs and setup flow; enforces real-world checks before shipment.

### III. User Experience Consistency

- Onboarding MUST be guided by the Ink-based CLI with clear, color-coded output (`RED` errors, `GREEN` success) and recovery steps (e.g., KV setup instructions).
- Documentation MUST practice progressive disclosure: quick start first; advanced features (D1, R2, custom domains) in `docs/`.
- CLI/script messages SHOULD mirror README guidance to prevent drift; when workflows change, update both code and docs.

Rationale: Consistent UX reduces setup friction and support load.

### IV. Performance Requirements

- Edge-first by default: Astro SSR is globally enabled (`output: 'server'`). Static generation is an explicit per-page override via `export const prerender = true`.
- Build output MUST remain predictable for Workers: `wrangler.toml` expects `main = "./astro-frontend/dist/_worker.js/index.js"` and `[assets]` binding `ASSETS`.
- Cold-start impact SHOULD be mitigated via KV-backed caching for frequently accessed Drupal data.
- Dependency footprint MUST remain lean for JSON:API: `jsona` and `drupal-jsonapi-params` only, unless justified.

Rationale: Edge constraints reward small, predictable bundles and cache-conscious designs.

### V. Operational Excellence

- The repo MUST be reproducible from scratch: `setup.sh` yields a working local environment without hidden steps.
- CI/CD MUST mirror local commands (ddev, npm build, wrangler deploy) and branch-based env selection (main=production, staging=staging).
- The system MUST degrade gracefully: missing KV → actionable error; unreachable Drupal → visible build/runtime error (no silent fallbacks); Workers dev failure → fallback to Astro dev server.

Rationale: Predictable operations ensure fast recovery and confidence in deployments.

## Additional Constraints & Performance Standards

- SSR is enabled globally in `astro-frontend/astro.config.mjs` with the Cloudflare adapter; use `prerender` per page to opt into static output when appropriate.
- `wrangler.toml` resides in the project root and MUST reference `astro-frontend/dist/` outputs; update it if Astro output paths change.
- KV namespace `SESSION` MUST be created and bound in `wrangler.toml`; developers MUST update the namespace `id` after creation.
- Environment values derive from `PROJECT_NAME`; DDEV host MUST follow `http://{PROJECT_NAME}.ddev.site` and JSON:API at `/jsonapi`.
- GitHub Actions MUST use branch-specific environment variables and secrets as documented in `docs/github-actions.md`.

## Development Workflow & Quality Gates

- Gates before release:
  1. Setup Gate: DDEV site reachable at `http://{PROJECT_NAME}.ddev.site`.
  2. Integration Gate: Astro dev server fetches Drupal JSON:API successfully (uses `jsona` and `drupal-jsonapi-params`).
  3. Deployment Gate: Workers deployment responds at `https://{PROJECT_NAME}.workers.dev`.
- Scripts MUST follow established conventions: shebang `#!/usr/bin/env bash`, color variables (`RED`, `GREEN`, `YELLOW`, `NC`), helper functions (`print_status`, `print_error`), dependency checks, and `.env` loading.
- Workers local dev SHOULD use `npx wrangler dev --remote` when KV access is required.
- Any change to Cloudflare services (D1, R2, etc.) MUST update `wrangler.toml` bindings and corresponding docs.

## Governance

- Scope & Supremacy: This constitution governs development practices for Drupal_Astro_Kit and supersedes conflicting guidelines.
- Amendments: Proposals MUST include rationale, migration/impact notes, and doc updates. Approval requires reviewer consensus in PR and version bump per below.
- Versioning Policy: Semantic versioning for this constitution.
  - MAJOR: Backward-incompatible removals/redefinitions of principles.
  - MINOR: New principle/section added or materially expanded guidance.
  - PATCH: Clarifications, wording, non-semantic refinements.
- Compliance Review: All PRs MUST include a brief Constitution Check note referencing the gates relevant to the change.

**Version**: 1.0.0 | **Ratified**: 2025-11-07 | **Last Amended**: 2025-11-07
