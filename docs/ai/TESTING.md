# TESTING

## What Exists Today

- **No dedicated unit/integration test suite in this repo** (no Jest/Vitest/PhpUnit config checked in at repo root).
- **CI pipeline is defined** but references generated artifacts and commands that may not exist until setup runs:
  - `.github/workflows/main.yml` runs `npm test` in `astro-frontend/` and `ddev drush test:run --all` in `drupal-backend/`.
- **Audit toolkit** provides structured validation checks:
  - Entrypoint: `audit/index.js` (run via `audit/package.json` scripts like `npm run audit:all`).

## Practical Manual Test Checklist (recommended)

- **Bootstrap**
  - Run `./setup.sh` (repo root) and ensure it completes: `setup.sh`, `setup/ui.js`
  - Verify generated dirs exist: `drupal-backend/`, `astro-frontend/` (both are gitignored in `.gitignore`)
- **Drupal health**
  - `cd drupal-backend && ddev start && ddev launch` (DDEV site loads)
  - Confirm JSON:API responds: `http://<project>.ddev.site/jsonapi` (setup enables JSON:API via `setup/ui.js`)
- **Astro dev**
  - `cd astro-frontend && npm run dev` (renders pages; content fetch behavior depends on implementation in generated project)
- **Astro build**
- `cd astro-frontend && npm run build` (uses `getStaticPaths()` from `src/pages/[...slug].astro` copied from `templates/astro-src/pages/[...slug].astro`; homepage is `src/pages/index.astro`)
  - Confirm output routes exist under `astro-frontend/dist/`
- **Deploy (optional)**
  - `./scripts/deploy-frontend.sh` (requires Cloudflare credentials in `.env`)

## Audit Tool (repo-provided checks)

- Install/run:
  - `cd audit && npm install`
  - `npm run audit:all` (or target-specific scripts in `audit/package.json`)
- Contract/schema:
  - Output should conform to `specs/001-project-audit-optimization/contracts/audit-report.schema.json`

## Assumptions

- The generated `astro-frontend/` will contain a working `npm test` script only if the chosen Astro template includes one; confirm by inspecting `astro-frontend/package.json` post-setup.
- Drupal test execution in CI (`drush test:run --all`) depends on the generated Drupal site including test infrastructure and appropriate permissions; confirm by running that command inside DDEV after setup.
