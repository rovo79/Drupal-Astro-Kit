# STACK

## Languages & Runtimes

- **Node.js**
  - Setup CLI (ESM): `setup/package.json` (`"type": "module"`)
  - Audit toolkit (ESM): `audit/package.json` (`"type": "module"`)
- **Shell (bash):** `setup.sh`, `scripts/deploy-frontend.sh`, `scripts/seed-content.sh`
- **Astro + TypeScript (template source):** `templates/astro-src/**/*.astro`, `templates/astro-src/**/*.ts`
- **Drupal / PHP (generated at setup time):** created under `drupal-backend/` by `setup/ui.js` via DDEV + Composer + Drush.

## Core Products / Platforms

- **Drupal 11** (headless CMS; JSON:API enabled during setup): `setup/ui.js` (runs `drush en jsonapi -y`)
- **DDEV** (local Drupal runtime): `setup/ui.js`, `.github/workflows/main.yml`, `README.md`
- **Astro** (static site generation): configured by `setup/ui.js` (writes `astro-frontend/astro.config.mjs` with `output: 'static'`)
- **Cloudflare Pages** (static hosting): `scripts/deploy-frontend.sh` (uses `wrangler pages deploy`)
- **GitHub Actions** (CI/CD): `.github/workflows/main.yml`

## Key Node Dependencies (in this repo)

- **Setup CLI dependencies** (`setup/package.json`)
  - UI: `@clack/prompts`
  - Process execution: `execa`
  - Terminal UX: `picocolors`
  - YAML parsing: `js-yaml`
  - Image processing: `sharp`
- **Audit toolkit dependencies**
  - No audit package is tracked in the V1 repo. Local ignored `audit/` worktrees may have their own dependencies.

## API / Data Formats

- **Drupal JSON:API** (content fetch at build time)
  - Client implementation: `templates/astro-src/lib/drupal.ts`
  - No tracked OpenAPI contract is currently present in V1.

## Configuration & “Glue”

- Environment templates: `.env.example`, `.env.template`
- Generated frontend config (written by setup):
  - `astro-frontend/astro.config.mjs` (static output)
  - `astro-frontend/wrangler.jsonc` (Pages config)
- CI workflow: `.github/workflows/main.yml`

## Assumptions

- Exact versions of Drupal/PHP are enforced by DDEV + the Drupal recommended project created during setup; confirm by inspecting generated `drupal-backend/composer.json` and `drupal-backend/.ddev/config.yaml` after running `./setup.sh`.
- Astro/Pages config is created during setup; confirm by inspecting generated `astro-frontend/astro.config.mjs` and `astro-frontend/wrangler.jsonc` after setup.
