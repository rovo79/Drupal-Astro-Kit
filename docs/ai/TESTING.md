# TESTING

## What Exists Today

- **No dedicated unit/integration test suite in this repo** (no Jest/Vitest/PhpUnit config checked in at repo root).
- **CI pipeline** (`.github/workflows/main.yml`) is a 37-line single-job static deploy: `npm ci`, `npm run build`, then `cloudflare/pages-action@v1`. It does not run a test command.
- **Audit toolkit is not currently repo-provided**: `audit/` is ignored in `.gitignore`. Some local worktrees may have it, but contributors should not assume it is available from a fresh clone.

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

## Audit Tool (local-only, if present)

- `audit/` and `specs/` are local ignored artifacts in the current V1 repo shape.
- If your local worktree has them, install/run:
  - `cd audit && npm install`
  - `npm run audit:all` (or target-specific scripts in `audit/package.json`)
- Do not treat audit output or spec contracts as fresh-clone validation gates unless those directories are deliberately made tracked repo assets.

## Assumptions

- The generated `astro-frontend/` will contain a working `npm test` script only if the chosen Astro template includes one; confirm by inspecting `astro-frontend/package.json` post-setup.
- The CI pipeline does not run tests. It builds the static site and deploys to Cloudflare Pages.
