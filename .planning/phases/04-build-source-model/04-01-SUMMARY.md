---
phase: 04-build-source-model
plan: 01
status: complete
started: 2026-03-12T14:31:02Z
completed: 2026-03-12T14:32:45Z
duration: ~2 min
subsystem: docs, config
affects: []
tech-stack:
  added: []
  modified: []
key-files:
  created: []
  modified: [.env.example, docs/deployment.md, docs/architecture.md]
patterns: [local-first-default, section-grouping]
decisions:
  - NODE_ENV and DRUPAL_ENV moved to Deprecated (not used by V1 static build)
  - DRUPAL_API_URL moved to Deprecated (already marked deprecated, now grouped)
---

# Summary: 04-01 — Build Source Model

**One-liner:** Declared local-first as V1 default by restructuring .env.example into Required/Optional/Deprecated sections and labeling CI/hosted paths as "Optional Advanced" in deployment and architecture docs.

## What Changed

### Task 1: Restructure .env.example (5dd1ed9)
- Rewrote `.env.example` with clear section headers using visual separators
- **Required: Local Development** — the 7 vars needed to get started (PROJECT_NAME, DRUPAL_BASE_URL, DRUPAL_JSONAPI_URL, DRUPAL_ADMIN_USER, DRUPAL_ADMIN_PASS, API_BASE_URL, HOMEPAGE_ALIAS)
- **Optional: Deployment** — Cloudflare credentials with cross-reference to docs/deployment.md
- **Optional Advanced: Development Tools** — ENABLE_XDEBUG, ENABLE_MAILHOG, ENABLE_ADMINER
- **Optional Advanced: Performance Tuning** — PHP_MEMORY_LIMIT, PHP_MAX_EXECUTION_TIME
- **Deprecated** — DRUPAL_API_URL, NODE_ENV, DRUPAL_ENV moved from active vars to comment-only section
- Added V1 operating model header explaining local-first default

### Task 2: Label CI/hosted paths in docs (35771ca)
- **docs/deployment.md**: Added local-first default callout at top with anchor link to CI section
- **docs/deployment.md**: Changed "CI/CD Automation (Optional)" to "CI/CD Automation (Optional Advanced)" with explanatory callout
- **docs/deployment.md**: Added warning on "Option 2: Hosted Drupal" that hosting Drupal is beyond V1 scope
- **docs/architecture.md**: Changed "CI/CD (Optional)" to "CI/CD (Optional Advanced)" with local-first callout

## Verification

| Check | Result |
|-------|--------|
| `grep 'Local Development' .env.example` | PASS — Required section exists |
| `grep 'Optional.*Deployment' .env.example` | PASS — Optional deployment section exists |
| `grep 'Optional Advanced' .env.example` | PASS — Advanced sections exist |
| `grep 'Deprecated' .env.example` | PASS — Deprecated section exists |
| `grep 'deployment.md' .env.example` | PASS — Cross-reference present |
| `grep -c 'Optional' .env.example` >= 2 | PASS — Returns 3 |
| `grep 'Optional Advanced' docs/deployment.md` | PASS |
| `grep 'local-first' docs/deployment.md` | PASS |
| `grep 'Optional Advanced' docs/architecture.md` | PASS |
| `grep 'local-first' docs/architecture.md` | PASS |
| All original vars accounted for | PASS — 15 active + 3 deprecated |

## Key Decisions

1. **NODE_ENV and DRUPAL_ENV → Deprecated:** These environment selection vars aren't used by the V1 static build pipeline. Moved to Deprecated comment section rather than keeping as active vars that suggest they do something.
2. **DRUPAL_API_URL → Deprecated:** Already marked deprecated inline; now properly grouped in the Deprecated section.
3. **Anchor link in deployment.md callout:** Added `#cicd-automation-optional-advanced` link so the top-of-page callout links directly to the CI section for discoverability.

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

This completes Phase 4 (Build Source Model) and the entire roadmap. All 4 phases are complete:
- Phase 1: Identity (README, package.json, anti-identity)
- Phase 2: Documentation Structure (docs cleanup, codebase map alignment)
- Phase 3: Publishing Workflow (publishing.md, architecture cross-ref)
- Phase 4: Build Source Model (.env.example restructure, CI/hosted labeling)
