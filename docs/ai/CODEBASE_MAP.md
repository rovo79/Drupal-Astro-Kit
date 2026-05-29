# CODEBASE_MAP

- **What this repo is:** a starter-kit “generator” repo that bootstraps two *generated* projects:
  - `drupal-backend/` (Drupal 11 running in DDEV)
  - `astro-frontend/` (Astro site that fetches Drupal JSON:API + Linkset at build time and emits static HTML)
- **Primary user flow:** run `setup.sh` → interactive CLI provisions `.env`, Drupal (via DDEV), Astro frontend, and some config/templates.

## Top-Level Layout (what lives in git)

- `setup.sh`: bootstrap wrapper (installs `setup/` deps, runs `setup/cli.js`).
- `setup/`: interactive installer (Ink + React CLI) that orchestrates DDEV/Composer/Drush and Astro scaffolding.
  - Entrypoints: `setup/cli.js` → `setup/ui.js` (main flow), `setup/ui-automated.js` (older/alternative non-prompt flow).
- `templates/astro-src/`: source templates copied into the generated Astro app (`astro-frontend/src/...`).
  - Key runtime template entrypoints:
    - `templates/astro-src/pages/index.astro` (homepage route).
    - `templates/astro-src/pages/[...slug].astro` (catch-all route + `getStaticPaths()`).
    - `templates/astro-src/lib/drupal.ts` (JSON:API page client + Linkset menu client + routing helpers).
    - `templates/astro-src/layouts/Base.astro` (layout wrapper; renders Linkset-backed navigation).
- `scripts/`: helper scripts meant to run *after* setup created `drupal-backend/` + `astro-frontend/`.
  - `scripts/deploy-frontend.sh`: builds + deploys static site to Cloudflare Pages.
  - `scripts/seed-content.sh`: seeds sample Drupal content via `ddev exec drush php:eval`.
- `audit/`: ignored local audit toolkit if present. It is not currently a tracked fresh-clone asset.
- `docs/`: user-facing docs. V1 docs at root (`architecture.md`, `deployment.md`, `troubleshooting.md`); legacy SSR-era docs walled off in `docs/future/`.
- `specs/`: ignored local spec-kit artifacts if present. They are not currently tracked V1 source-of-truth files.
- `.github/workflows/main.yml`: CI/CD workflow (expects generated artifacts in repo root; see risks in `docs/ai/SECURITY_AND_RISKS.md`).

## Main Runtime Entrypoints (after `./setup.sh`)

- **Drupal backend (generated):** `drupal-backend/` (created by `setup/ui.js` via `ddev config`, `ddev start`, `ddev composer create-project`, `drush site:install`, etc).
- **Astro frontend (generated):** `astro-frontend/`
  - Route generation: `astro-frontend/src/pages/index.astro` + `astro-frontend/src/pages/[...slug].astro` (from `templates/astro-src/pages/index.astro` + `templates/astro-src/pages/[...slug].astro`).
  - JSON:API fetch layer: `astro-frontend/src/lib/drupal.ts` (from `templates/astro-src/lib/drupal.ts`).
- **Deployment (static):** `scripts/deploy-frontend.sh` → `npx wrangler pages deploy ./dist`.

## “Where To Make Changes” Map

- **Setup / bootstrapping**
  - Step orchestration, prompts, DDEV/Composer/Drush commands: `setup/ui.js`
  - CLI entry + Ink wiring: `setup/cli.js`
  - Wrapper script: `setup.sh`
- **Routing**
  - Homepage routing: `templates/astro-src/pages/index.astro`
  - Catch-all slug routing + route generation rules: `templates/astro-src/pages/[...slug].astro`
  - Alias normalization/homepage behavior: `templates/astro-src/lib/drupal.ts`
- **Data models / API**
  - JSON:API deserialization + pagination + query params: `templates/astro-src/lib/drupal.ts`
  - API contracts/specs: no tracked V1 contract directory; ignored `specs/` may exist locally.
- **UI**
  - Base layout + global styling: `templates/astro-src/layouts/Base.astro`
  - Page rendering: `templates/astro-src/pages/index.astro`, `templates/astro-src/pages/[...slug].astro`
- **Infra / CI / automation**
  - GitHub Actions: `.github/workflows/main.yml`
  - Cloudflare deploy script: `scripts/deploy-frontend.sh`
  - Audit tooling: no tracked V1 audit toolkit; ignored `audit/` may exist locally.
- **Tests**
  - No unit-test suite in this repo; validation is mostly via CI and manual workflows.
  - CI config references: `.github/workflows/main.yml`
- **Docs**
  - V1 user docs: `docs/architecture.md`, `docs/deployment.md`, `docs/troubleshooting.md`
  - Legacy/future reference: `docs/future/` (SSR-era docs, walled off)
  - AI-maintained docs: `docs/ai/`
  - Specs/decision records: no tracked V1 specs directory; ignored `specs/` may exist locally.

## Assumptions

- Generated directories (`drupal-backend/`, `astro-frontend/`) are not committed and may not exist until `./setup.sh` completes; confirm by running `./setup.sh` and then inspecting `drupal-backend/` and `astro-frontend/`.
- “Main runtime entrypoints” for the *generated* projects (e.g., `astro-frontend/package.json`, `drupal-backend/.ddev/config.yaml`) are not present in this repo until setup runs; confirm by inspecting those paths post-setup.
