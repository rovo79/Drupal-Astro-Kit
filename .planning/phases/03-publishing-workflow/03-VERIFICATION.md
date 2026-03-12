---
phase: 03-publishing-workflow
verified: 2026-03-12T00:00:00Z
status: passed
score: 5/5 must-haves verified
---

# Phase 3 Verification: Publishing Workflow

**Phase Goal:** A developer understands exactly how content goes from Drupal to the live site — and understands that rebuild-to-publish is a deliberate design choice, not a limitation.

**Verified:** 2026-03-12
**Status:** PASSED
**Re-verification:** No — initial verification

## Must-Have Results

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A standalone publishing workflow doc exists at docs/publishing.md | ✅ PASS | File exists, 89 lines, substantive content with sections: Mental Model, Why Rebuild-to-Publish?, Step-by-Step, Quick Reference, See Also |
| 2 | The doc explains the full path: edit in Drupal → rebuild Astro → deploy to Pages | ✅ PASS | Line 12: `Edit in Drupal → Save/Publish → Rebuild Astro → Deploy to Pages → Live` — complete pipeline shown as ASCII flow diagram plus step-by-step walkthrough (sections 1-3) |
| 3 | The doc states plainly that 'publish in Drupal' does not mean 'live on the site' and explains why this is intentional | ✅ PASS | Line 3: "Editing content in Drupal does not automatically update the live site...This is by design." Line 9: "When you click 'Publish' in Drupal, you're marking content as *ready*." Line 19: "This is a deliberate choice, not a limitation." Lines 22-30: Full tradeoff explanation with benefits and explicit comparison to the alternative |
| 4 | The canonical deploy commands are documented with copy-pasteable examples | ✅ PASS | `npm run build` at lines 50, 78. `./scripts/deploy-frontend.sh` at lines 60, 79. Manual wrangler command at line 67. Quick Reference section (lines 72-80) gives the full 3-command cycle in a single copy-pasteable block |
| 5 | A developer new to the project can find the publishing doc from README and docs/ | ✅ PASS | README.md line 32: "Publishing Workflow" in Table of Contents. README.md line 167: direct link `[docs/publishing.md](docs/publishing.md)`. docs/architecture.md line 136: link `[Publishing Workflow](publishing.md)` in Content Updates section |

**Score:** 5/5 truths verified

## Artifact Checks

| Artifact | Exists | Content Check | Status |
|----------|--------|---------------|--------|
| `docs/publishing.md` | ✅ yes (89 lines) | Contains "rebuild" (7 matches), "deliberate" + "by design" (2 matches), `deploy-frontend` (2 matches), `npm run build` (3 matches). Zero stub patterns (no TODO/FIXME/placeholder). | ✅ PASS |
| `README.md` | ✅ yes | Contains "Publishing Workflow" in ToC (line 32) and link to `docs/publishing.md` (line 167) | ✅ PASS |
| `docs/architecture.md` | ✅ yes | Contains link to `publishing.md` in Content Updates section (line 136) | ✅ PASS |

## Key Link Checks

| From | To | Status | Evidence |
|------|-----|--------|----------|
| `README.md` → `docs/publishing.md` | Table of Contents + Build & Deployment section | ✅ PASS | Line 32: "Publishing Workflow" in ToC. Line 167: `see [docs/publishing.md](docs/publishing.md)` — correct relative path from repo root |
| `docs/architecture.md` → `publishing.md` | Content Updates section | ✅ PASS | Line 136: `see [Publishing Workflow](publishing.md)` — correct relative path from within docs/ |
| `docs/publishing.md` → `docs/deployment.md` | See Also section | ✅ PASS | Line 88: `[Deployment Guide](deployment.md)` — cross-reference exists and deployment.md confirmed present in docs/ |
| `docs/publishing.md` → `docs/architecture.md` | See Also section | ✅ PASS | Line 89: `[Architecture Overview](architecture.md)` — bidirectional linking confirmed |

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | — |

No TODO, FIXME, placeholder, or stub patterns detected in any phase artifacts.

## Human Verification Required

### 1. Readability for new developers
**Test:** Have someone unfamiliar with the project read `docs/publishing.md` and explain back the publish cycle
**Expected:** They can articulate: edit in Drupal, rebuild Astro, deploy to Pages — and understand Drupal "publish" ≠ live
**Why human:** Document clarity and comprehension can't be verified by grep

### 2. Link navigation works in rendered Markdown
**Test:** Open README.md in GitHub and click the publishing.md link
**Expected:** Navigates to `docs/publishing.md` correctly
**Why human:** Relative path correctness in rendered Markdown depends on hosting context

## Overall Result

**PASSED**: 5/5 must-haves verified

All observable truths confirmed against actual file contents. The publishing workflow document is substantive (89 lines), well-structured, contains the required mental model, tradeoff framing ("deliberate choice, not a limitation"), copy-pasteable commands, and is discoverable from both README.md and docs/architecture.md with correct relative links. No stubs or placeholders detected.

---

_Verified: 2026-03-12_
_Verifier: Claude (gsd-verifier)_
