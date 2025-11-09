# Quickstart: Project Audit & Optimization

## Purpose

Perform a validation pass of setup automation, SSR parity, Drupal JSON:API integration, KV binding, CI/CD behavior, and documentation accuracy.

## Prerequisites

- Docker + DDEV installed
- Node.js 20+ and npm
- Cloudflare account & API token (for Workers + KV)

## Steps

1. Clean Clone & Setup

```bash
rm -rf /tmp/drupal_astro_audit && mkdir /tmp/drupal_astro_audit && cd /tmp/drupal_astro_audit
# Clone your fork/repo
git clone <your_repo_url> .
chmod +x setup.sh
./setup.sh
```

1. Verify Setup Artifacts

```bash
ls -1 drupal-backend astro-frontend wrangler.toml .env
grep PROJECT_NAME .env
```

1. Start Drupal & Frontend Dev

```bash
cd drupal-backend && ddev launch &
cd ../astro-frontend && npm run dev &
```

1. Workers Dev & KV

```bash
# Create KV if not present
npx wrangler kv namespace create "SESSION"
# Update wrangler.toml with returned id, then:
npx wrangler dev --remote
```

1. JSON:API Probe

```bash
curl -s http://$(grep PROJECT_NAME .env | cut -d'=' -f2).ddev.site/jsonapi | head -c 400
```

1. Build & Deploy (Dry Run)

```bash
cd astro-frontend
npm run build
npx wrangler deploy --dry-run
```

1. CI/CD Review

- Open `.github/workflows/main.yml`
- Confirm validation, frontend, backend jobs logic matches docs.

1. Documentation Drift Check

- Compare `docs/` instructions vs actual file paths (`wrangler.toml`, `astro-frontend/astro.config.mjs`)
- Log mismatches.

## Outputs

- Findings list (category, severity, evidence)
- Recommendations list (action, impact, effort)
- Gate results (setup, integration, deployment)

## Next

Use generated schema in `contracts/audit-report.schema.json` for structuring report JSON in a future automation feature.
