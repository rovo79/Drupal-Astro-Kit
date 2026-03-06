# SECURITY_AND_RISKS

## Secrets & Credentials

- `.env` is gitignored, but setup encourages storing sensitive Cloudflare tokens locally:
  - `.env.example` includes `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
  - `scripts/deploy-frontend.sh` reads `.env` and exports variables
- Default Drupal admin credentials may be weak if left unchanged:
  - Setup prompts include default `admin`/`admin`: `setup/ui.js`
  - `.env.example` includes `DRUPAL_ADMIN_USER=admin`, `DRUPAL_ADMIN_PASS=admin`

## Supply Chain / Dependency Hygiene

- `node_modules/` directories appear committed under `setup/node_modules/` and `audit/node_modules/` (present in the repo tree).
  - Risk: large footprint, stale dependencies, and harder security patching vs lockfile-based installs.
  - Confirm by checking `setup/node_modules/` and `audit/node_modules/`.

## Network/Execution Surface

- Setup executes external tools and downloads code:
  - Drupal: `ddev composer create-project drupal/recommended-project:^11 ...`: `setup/ui.js`
  - Additional Drupal deps: `ddev composer require ...`: `setup/ui.js`
  - Astro project creation: `npm create astro@latest ...`: `setup/ui.js`
  - These require network access and trust in upstream registries.
- Scripts execute commands inside containers (`ddev exec drush ...`) and can mutate the Drupal DB/site state:
  - `scripts/seed-content.sh`

## Configuration Drift (Correctness → Security Impact)

- Cloudflare config format is now consistent: setup writes `astro-frontend/wrangler.jsonc`, CI deploys via `cloudflare/pages-action@v1`, and deploy script uses `wrangler pages deploy`.
  - Legacy SSR-era docs (`docs/cloudflare-setup.md`) reference older config patterns but carry Phase 2 banners.
- Env var contract for Drupal API base:
  - Templates read `import.meta.env.API_BASE_URL`: `templates/astro-src/lib/drupal.ts`
  - Setup stamps both `API_BASE_URL` and `DRUPAL_JSONAPI_URL` (plus deprecated `DRUPAL_API_URL` for backwards compatibility): `setup/ui.js`
  - Risk: builds fail if `API_BASE_URL` isn't set or points to an unreachable Drupal instance.

## CORS / Exposure

- The setup flow configures Drupal for decoupled access and enables JSON:API: `setup/ui.js`
  - Risk: permissive CORS or anonymous content permissions could expose content if Drupal is hosted publicly later.
  - Confirm generated config by inspecting `drupal-backend/web/sites/default/services.yml` post-setup (setup writes config via Drush PHP eval in `setup/ui.js`).

## Operational Risks

- Build-time coupling to Drupal availability:
  - Static build requires Drupal JSON:API reachable; CI runners can't reach local DDEV.
  - Risk: failed deploys if `API_BASE_URL` secret isn't set or the Drupal source is unreachable from the CI runner.
  - Local build + deploy (`scripts/deploy-frontend.sh`) sidesteps this by using DDEV directly.

## Assumptions

- This repo is primarily a local-first starter kit; if Drupal is later hosted publicly, you’ll need a separate security hardening pass (permissions, CORS, auth, update policy); confirm by reviewing generated Drupal config and deployment environment.
- The committed `node_modules/` directories are intentional (e.g., to simplify onboarding) rather than accidental; confirm by checking project policy in `README.md` or by reviewing commit history around dependency changes.

