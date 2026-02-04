# DEPLOYMENT

## Default Target: Cloudflare Pages (Static)

- Deployment model: build locally → upload `astro-frontend/dist/` to Cloudflare Pages.
  - Scripted path: `scripts/deploy-frontend.sh`
  - Manual path: `cd astro-frontend && npx wrangler pages deploy ./dist --project-name="$PROJECT_NAME"`
- Prerequisites:
  - Drupal reachable at build time (local DDEV in the recommended flow): `README.md`, `docs/deployment.md`
  - Cloudflare credentials in `.env`: `.env.example`, `scripts/deploy-frontend.sh`

## CI/CD (GitHub Actions)

- Workflow definition: `.github/workflows/main.yml`
  - Frontend job installs deps, runs `npm test`, builds, then deploys with `cloudflare/pages-action@v1`.
  - Backend job provisions DDEV, installs Drupal deps, runs `drush test:run --all`, then runs `drush deploy`.
- Key risk: workflow validation currently expects `wrangler.toml` at repo root, but setup writes `astro-frontend/wrangler.jsonc` (Pages config). See `.github/workflows/main.yml` and `setup/ui.js`.

## Environment Variables / Secrets

- Local `.env` template: `.env.example`
  - `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `PROJECT_NAME` / `CLOUDFLARE_PROJECT_NAME`
- GitHub Secrets referenced by CI: `.github/workflows/main.yml`
  - Cloudflare: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
  - Frontend build: `PROD_API_URL`, `STAGING_API_URL`, analytics IDs
  - Backend deploy: `PROD_DDEV_HOST`, `STAGING_DDEV_HOST`, SSH key secrets

## “Drupal Reachability” Constraint

- Static builds require Drupal JSON:API reachable to the build runner.
  - Local build + deploy is the simplest approach.
  - If using CI to build, Drupal must be hosted somewhere CI can reach (or you must commit build artifacts, which is generally discouraged).
  - See `docs/troubleshooting.md` (“Build Works Locally, Fails in CI”).

## Assumptions

- The intended production deploy is Cloudflare Pages because `scripts/deploy-frontend.sh` uses `wrangler pages deploy` and setup writes `astro-frontend/wrangler.jsonc`; confirm by searching `setup/ui.js` for `wrangler.jsonc`.
- Backend “deploy to DDEV” in `.github/workflows/main.yml` may be aspirational or environment-specific; confirm the intended backend deployment target by inspecting team infra docs or adjusting workflow requirements.

