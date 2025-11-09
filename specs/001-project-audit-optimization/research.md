# Research: Project Audit & Optimization

**Branch**: `001-project-audit-optimization`
**Date**: 2025-11-07

## Decisions

### D1: Manual vs Automated Tests (initial scope)

- Decision: Keep manual gates for this audit; capture concrete steps and logs. Plan automated tests in a subsequent feature.
- Rationale: Current project intentionally documents manual workflow; introducing tests now would expand scope materially.
- Alternatives: Add Playwright + Drush in this feature; Defer only Drush; Defer only Playwright.

### D2: SSR Performance Baseline

- Decision: Record qualitative parity (Astro dev vs Workers dev) and collect initial page load metrics manually (DevTools timing, Workers logs).
- Rationale: Establish a baseline before setting targets; avoids over-optimizing prematurely.
- Alternatives: Define numeric targets now; instrument synthetic checks.

### D3: KV Usage Extent

- Decision: Limit to `SESSION` binding validation (read/write sanity checks). Do not expand to caching layer in this feature.
- Rationale: Keep scope focused on validation; caching strategies belong to future optimization work.
- Alternatives: Prototype cache helpers; add config/invalidations.

## Findings & Notes

- Setup CLI (Ink + execa) handles `.env`, DDEV init, Astro scaffolding, Wrangler config. Manual KV step documented.
- Workers build output path is fixed; any Astro output changes must reflect in `wrangler.toml` (`main`) and `[assets]`.
- JSON:API libraries (`jsona`, `drupal-jsonapi-params`) are installed during setup; verify page example exists or add a minimal check snippet during validation.

## Open Questions (Resolved)

- Q1: Add automated tests now? → No, document and defer (see D1).
- Q2: Define numeric SSR targets? → No, collect baseline first (see D2).
- Q3: Expand KV usage to caching? → No, validate session binding only (see D3).
