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
  - Single-job pipeline: installs Node 20, runs `npm ci` + `npm run build` in `astro-frontend/`, then deploys static output via `cloudflare/pages-action@v1`.
  - Deploy step only runs on `main` branch pushes; PRs build but don't deploy.
  - No backend job (Drupal is local-only, not deployed via CI).

## Environment Variables / Secrets

- Local `.env` template: `.env.example`
  - `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `PROJECT_NAME`
- GitHub Secrets referenced by CI: `.github/workflows/main.yml`
  - `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (deploy)
  - `API_BASE_URL` (build-time, points to a reachable Drupal JSON:API)

## “Drupal Reachability” Constraint

- Static builds require Drupal JSON:API reachable to the build runner.
  - Local build + deploy is the simplest approach.
  - If using CI to build, Drupal must be hosted somewhere CI can reach (or you must commit build artifacts, which is generally discouraged).
  - See `docs/troubleshooting.md` (“Build Works Locally, Fails in CI”).

## Assumptions

- The intended production deploy is Cloudflare Pages because `scripts/deploy-frontend.sh` uses `wrangler pages deploy` and setup writes `astro-frontend/wrangler.jsonc`; confirm by searching `setup/ui.js` for `wrangler.jsonc`.
- Drupal is local-only (DDEV). There is no backend deploy step in CI.

