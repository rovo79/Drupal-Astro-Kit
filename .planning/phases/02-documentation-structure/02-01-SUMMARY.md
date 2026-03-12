---
phase: 02-documentation-structure
plan: 01
status: complete
started: 2026-03-12T14:15:38Z
completed: 2026-03-12T14:17:55Z
duration: ~2 min
subsystem: docs
affects: [02-02]
tech-stack:
  added: []
  modified: []
key-files:
  created: [docs/future/README.md]
  modified: [docs/future/ssr-guide.md, docs/future/cloudflare-setup.md, docs/future/github-actions.md, docs/future/phase-2-workers-ssr.md, docs/troubleshooting.md]
patterns: []
decisions:
  - "Legacy file moves already done by parallel plan 02-02; this plan focused on gate README and cross-reference fixes"
  - "phase-2-workers-ssr.md self-references updated from docs/ prefix to bare filenames (same directory)"
---

# Summary: 02-01 — Move Legacy Docs to docs/future/

**One-liner:** Gate README for docs/future/ plus cross-reference fixes so V1 docs never link to legacy SSR files.

## What Changed

- **Created `docs/future/README.md`** — explains the directory contains non-V1 reference material, links back to V1 docs, and lists each file with a one-line description
- **Updated cross-references in all four legacy docs** — `architecture.md`, `deployment.md`, and `troubleshooting.md` links now use `../` prefix since files moved one level deeper
- **Fixed `phase-2-workers-ssr.md` self-references** — removed `docs/` prefix from sibling file references (they're now in the same directory)
- **Removed legacy link from `docs/troubleshooting.md`** — "Getting Help" section no longer lists Cloudflare Setup (now in docs/future/, not V1-relevant)

## Deviations from Plan

### Coordination with Parallel Plan

The four `git mv` operations (moving files from `docs/` to `docs/future/`) were already performed by plan 02-02, which ran in parallel. This plan focused on the remaining work: creating the gate README, fixing cross-reference links in the moved files, and cleaning V1 doc references. Not a deviation — both plans were designed for parallel execution with no file overlap, and the move was a natural part of 02-02's AI docs update.

## Verification

- `ls docs/` → `ai/ architecture.md deployment.md future/ troubleshooting.md` ✓
- `ls docs/future/` → `README.md cloudflare-setup.md github-actions.md phase-2-workers-ssr.md ssr-guide.md` ✓
- `docs/future/README.md` explains these are not V1 docs ✓
- All `../` prefixes correct in future/ files ✓
- `grep` for legacy refs in V1 docs returns empty ✓
- `docs/troubleshooting.md` Getting Help lists only Architecture and Deployment guides ✓

## Key Decisions

1. **File moves handled by 02-02**: Since 02-02 executed first and already moved the files, this plan skipped redundant `git mv` and focused on content fixes
2. **Self-references in phase-2-workers-ssr.md**: Updated from `docs/ssr-guide.md` style to bare `ssr-guide.md` since files are now siblings in the same directory

## Commits

| Hash | Description |
|------|-------------|
| 3132e50 | Add gate README and fix cross-references in legacy docs |
| 63cbff4 | Remove legacy doc link from troubleshooting Getting Help |
