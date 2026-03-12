---
phase: 02-documentation-structure
plan: 02
status: complete
started: 2026-03-12T14:15:47Z
completed: 2026-03-12T14:16:46Z
duration: ~1 min
subsystem: docs/ai
affects: []
tech-stack:
  added: []
  modified: []
key-files:
  created: []
  modified:
    - docs/ai/ARCHITECTURE.md
    - docs/ai/CODEBASE_MAP.md
    - docs/ai/SECURITY_AND_RISKS.md
patterns: []
decisions:
  - "HOTSPOTS.md left unchanged — churn paths reflect git history, not current file locations"
  - "DEPLOYMENT.md left unchanged — no legacy SSR doc paths found"
---

# Summary: 02-02 — Update AI Docs Paths and V1 Framing

AI docs updated to reference legacy SSR-era files at their correct `docs/future/` paths and describe the docs/ directory split (V1 at root, legacy walled off in `docs/future/`).

## What Changed

- **ARCHITECTURE.md**: Updated 2 references — legacy doc paths (`ssr-guide.md`, `cloudflare-setup.md`, `github-actions.md`, `phase-2-workers-ssr.md`) now point to `docs/future/` instead of `docs/` root. Language changed from "carry banners" to "walled off in docs/future/".
- **CODEBASE_MAP.md**: Updated `docs/` directory description from generic "user-facing docs" to explicit split: V1 docs at root, legacy in `docs/future/`. Expanded the "Docs" section in the "Where To Make Changes" map to list V1 user docs, legacy/future reference, and AI-maintained docs as separate entries.
- **SECURITY_AND_RISKS.md**: Updated `docs/cloudflare-setup.md` → `docs/future/cloudflare-setup.md` with "walled off" language.
- **HOTSPOTS.md**: Reviewed — no changes needed. File paths in churn list reflect git history (correct as-is).
- **DEPLOYMENT.md**: Reviewed — no changes needed. No legacy SSR doc path references found.

## Verification

- `grep -rn` for stale root-level legacy paths (`docs/ssr-guide.md`, etc.) in `docs/ai/`: **zero matches** ✓
- `grep 'docs/future/' docs/ai/ARCHITECTURE.md`: **2 matches** ✓
- `grep 'docs/future/' docs/ai/CODEBASE_MAP.md`: **2 matches** ✓
- `grep 'docs/future/' docs/ai/SECURITY_AND_RISKS.md`: **1 match** ✓

## Key Decisions

- **HOTSPOTS.md unchanged**: The churn list paths (`docs/architecture.md`, `docs/deployment.md`, `docs/troubleshooting.md`) reflect git history frequency counts. These files still exist at those paths (they're V1 docs, not legacy). No stale references found in prose.
- **DEPLOYMENT.md unchanged**: Contains no references to legacy SSR-era doc files. All paths point to V1 docs or scripts.

## Deviations from Plan

None — plan executed exactly as written.
