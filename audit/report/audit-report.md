# Audit Report Summary

**Generated**: 11/9/2025, 5:16:57 PM

## Overview

| Metric | Count |
|--------|-------|
| Total Findings | 12 |
| Total Recommendations | 11 |
| Audit Targets Ran | 6 |
| High Severity | 7 |
| Medium Severity | 4 |
| Low Severity | 1 |

## Findings by Category

- **setup**: 6 finding(s)
- **ssr**: 2 finding(s)
- **api**: 1 finding(s)
- **kv**: 1 finding(s)
- **docs**: 2 finding(s)

## 🔴 High Severity Issues

### SETUP: DRUPAL_API_URL is missing from .env. JSON:API clients rely on this value.

**Evidence**: /Users/rob/Dev/Drupal_Astro_Kit/.env

**Recommendation**: Ensure setup automation appends DRUPAL_API_URL to .env after sync
**Effort**: trivial

### SETUP: Required command "wrangler" is not available in PATH.

**Evidence**: PATH

**Recommendation**: Install or expose the "wrangler" CLI before running ./setup.sh
**Effort**: low

### SETUP: wrangler.toml does not exist. Setup automation should provision this artifact.

**Evidence**: /Users/rob/Dev/Drupal_Astro_Kit/wrangler.toml

**Recommendation**: Run ./setup.sh to create wrangler.toml
**Effort**: low

### SSR: SSR parity audit: Astro dev server not reachable

**Evidence**: All 3 requests to Astro dev failed

### SSR: SSR parity audit: Workers dev not reachable

**Evidence**: All 3 requests to Workers dev failed

### API: JSON:API audit skipped: DRUPAL_JSONAPI_URL not configured

**Evidence**: DRUPAL_JSONAPI_URL missing from .env

### KV: KV audit: probe execution failed

**Evidence**: fetch failed

## 🟡 Medium Severity Issues

### SETUP: PROJECT_NAME is missing from .env. Setup script should stamp it during bootstrap.

**Evidence**: /Users/rob/Dev/Drupal_Astro_Kit/.env

### SETUP: astro-frontend/astro.config.mjs does not exist. Setup automation should provision this artifact.

**Evidence**: /Users/rob/Dev/Drupal_Astro_Kit/astro-frontend/astro.config.mjs

### SETUP: Drupal site at http://Drupal_Astro_Kit.ddev.site is not reachable (TypeError).

**Evidence**: fetch failed

### DOCS: Docs drift audit: 5 referenced path(s) not found in repository

**Evidence**: Missing: wrangler.toml, troubleshooting.md, github-actions.md, deployment.md, ssr-guide.md

## Audit Targets Status

- ❌ **setup**: undefined finding(s), undefined recommendation(s)
- ✅ **setup**: 6 finding(s), 6 recommendation(s)
- ❌ **ssr**: undefined finding(s), undefined recommendation(s)
- ✅ **ssr**: 2 finding(s), 2 recommendation(s)
- ❌ **api**: undefined finding(s), undefined recommendation(s)
- ✅ **api**: 1 finding(s), 1 recommendation(s)
- ❌ **kv**: undefined finding(s), undefined recommendation(s)
- ✅ **kv**: 1 finding(s), 1 recommendation(s)
- ❌ **ci**: undefined finding(s), undefined recommendation(s)
- ✅ **ci**: 0 finding(s), 0 recommendation(s)
- ❌ **docs**: undefined finding(s), undefined recommendation(s)
- ✅ **docs**: 2 finding(s), 1 recommendation(s)

## Recommended Next Steps

### Critical (Correctness)

- Ensure setup automation appends DRUPAL_API_URL to .env after sync (effort: trivial)
- Add DRUPAL_JSONAPI_URL to .env (e.g., http://{PROJECT_NAME}.ddev.site/jsonapi) (effort: trivial)

### Reliability

- Start DDEV with "ddev start" and ensure http://Drupal_Astro_Kit.ddev.site is reachable (effort: low)
- Verify Astro dev server is running (npm run dev) on the expected port (effort: trivial)
- Verify Workers dev is running (npx wrangler dev --remote) on the expected port (effort: trivial)

---

For detailed findings and recommendations, see the JSON report.
Last updated: 11/9/2025, 5:16:57 PM
