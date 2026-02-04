# CODEBASE_MAP

- **What this repo is:** a starter-kit “generator” repo that bootstraps two *generated* projects:
  - `drupal-backend/` (Drupal 11 running in DDEV)
  - `astro-frontend/` (Astro site that fetches Drupal JSON:API at build time and emits static HTML)
- **Primary user flow:** run `setup.sh` → interactive CLI provisions `.env`, Drupal (via DDEV), Astro frontend, and some config/templates.

## Top-Level Layout (what lives in git)

- `setup.sh`: bootstrap wrapper (installs `setup/` deps, runs `setup/cli.js`).
- `setup/`: interactive installer (Ink + React CLI) that orchestrates DDEV/Composer/Drush and Astro scaffolding.
  - Entrypoints: `setup/cli.js` → `setup/ui.js` (main flow), `setup/ui-automated.js` (older/alternative non-prompt flow).
- `templates/astro-src/`: source templates copied into the generated Astro app (`astro-frontend/src/...`).
  - Key runtime template entrypoints:
    - `templates/astro-src/pages/[...slug].astro` (catch-all route + `getStaticPaths()`).
    - `templates/astro-src/lib/drupal.ts` (JSON:API client + routing helpers).
    - `templates/astro-src/layouts/Base.astro` (layout wrapper).
- `scripts/`: helper scripts meant to run *after* setup created `drupal-backend/` + `astro-frontend/`.
  - `scripts/deploy-frontend.sh`: builds + deploys static site to Cloudflare Pages.
  - `scripts/seed-content.sh`: seeds sample Drupal content via `ddev exec drush php:eval`.
- `audit/`: Node-based audit toolkit (structured JSON report) intended to validate setup/integration/CI/docs.
  - Entrypoint: `audit/index.js` (via `npm run audit:*` scripts in `audit/package.json`).
- `docs/`: user-facing docs (architecture/deployment/troubleshooting/etc).
- `specs/`: “spec kit” style feature specs + contracts (e.g., audit report schema, JSON:API contracts, OpenAPI).
- `.github/workflows/main.yml`: CI/CD workflow (expects generated artifacts in repo root; see risks in `docs/ai/SECURITY_AND_RISKS.md`).

## Main Runtime Entrypoints (after `./setup.sh`)

- **Drupal backend (generated):** `drupal-backend/` (created by `setup/ui.js` via `ddev config`, `ddev start`, `ddev composer create-project`, `drush site:install`, etc).
- **Astro frontend (generated):** `astro-frontend/`
  - Route generation: `astro-frontend/src/pages/[...slug].astro` (from `templates/astro-src/pages/[...slug].astro`).
  - JSON:API fetch layer: `astro-frontend/src/lib/drupal.ts` (from `templates/astro-src/lib/drupal.ts`).
- **Deployment (static):** `scripts/deploy-frontend.sh` → `npx wrangler pages deploy ./dist`.

## “Where To Make Changes” Map

- **Setup / bootstrapping**
  - Step orchestration, prompts, DDEV/Composer/Drush commands: `setup/ui.js`
  - CLI entry + Ink wiring: `setup/cli.js`
  - Wrapper script: `setup.sh`
- **Routing**
  - Catch-all slug routing + route generation rules: `templates/astro-src/pages/[...slug].astro`
  - Alias normalization/homepage behavior: `templates/astro-src/lib/drupal.ts`
- **Data models / API**
  - JSON:API deserialization + pagination + query params: `templates/astro-src/lib/drupal.ts`
  - API contracts/specs: `specs/003-static-ssg-refactor/contracts/`, `specs/002-drupal-api-config/contracts/openapi.yaml`
- **UI**
  - Base layout + global styling: `templates/astro-src/layouts/Base.astro`
  - Page rendering: `templates/astro-src/pages/[...slug].astro`
- **Infra / CI / automation**
  - GitHub Actions: `.github/workflows/main.yml`
  - Cloudflare deploy script: `scripts/deploy-frontend.sh`
  - Audit tooling (DX/reliability gates): `audit/`
- **Tests**
  - No unit-test suite in this repo; validation is mostly via CI + manual workflows + `audit/` scripts.
  - CI config references: `.github/workflows/main.yml`
- **Docs**
  - User docs: `docs/`
  - Specs/decision records: `specs/`

## Assumptions

- Generated directories (`drupal-backend/`, `astro-frontend/`) are not committed and may not exist until `./setup.sh` completes; confirm by running `./setup.sh` and then inspecting `drupal-backend/` and `astro-frontend/`.
- “Main runtime entrypoints” for the *generated* projects (e.g., `astro-frontend/package.json`, `drupal-backend/.ddev/config.yaml`) are not present in this repo until setup runs; confirm by inspecting those paths post-setup.

