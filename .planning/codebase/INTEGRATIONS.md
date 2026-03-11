# External Integrations

**Analysis Date:** 2026-03-11

## APIs & External Services

**Drupal JSON:API (build-time only):**
- This is the primary integration. Astro fetches content from Drupal's JSON:API **at build time** to generate static HTML.
- SDK/Client: `jsona` (deserializer) + `drupal-jsonapi-params` (query builder) + native `fetch()`
- Client implementation: `templates/astro-src/lib/drupal.ts`
- Audit client: `audit/scripts/util/jsonapiClient.js`
- Auth: Anonymous access (no auth tokens — JSON:API is configured for public read)
- Env vars: `DRUPAL_JSONAPI_URL` (primary), `DRUPAL_API_URL` (deprecated fallback), `DRUPAL_BASE_URL`, `API_BASE_URL` (legacy fallback)
- Endpoints consumed:
  - `GET /jsonapi/node/page` - Fetch all published Basic Page nodes (with pagination)
  - Fields requested: `title`, `body`, `path`, `status`, `created`, `changed`
  - Filter: `status=1` (published only)
  - Pagination: follows `links.next.href` for full collection

**Cloudflare Pages:**
- Static site hosting for the generated Astro frontend
- SDK/Client: Wrangler CLI (`npx wrangler pages deploy ./dist`)
- Auth: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- Configuration: `wrangler.jsonc` generated in `astro-frontend/` with `pages_build_output_dir: "./dist"`
- Deploy script: `scripts/deploy-frontend.sh`

**Cloudflare Pages (GitHub Actions):**
- Automated deployment via `cloudflare/pages-action@v1`
- Workflow: `.github/workflows/main.yml`
- Triggers: push to `main` branch
- Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `API_BASE_URL`, `GITHUB_TOKEN`

## Data Storage

**Databases:**
- MariaDB (via DDEV) - Drupal's database, runs in Docker container
  - Connection: Managed by DDEV automatically
  - No direct connection from this repo — accessed via `ddev exec drush` commands
  - Used at setup time for `drush site:install` and content seeding

**File Storage:**
- Local filesystem only (no cloud storage integration)
- Drupal files: `drupal-backend/web/sites/default/files/` (in DDEV container)
- Static output: `astro-frontend/dist/` (deployed to Cloudflare Pages)

**Caching:**
- None at generator level
- Cloudflare Pages provides edge caching for the deployed static site

## Authentication & Identity

**Drupal Admin:**
- Custom credentials set during setup wizard (defaults: admin/admin)
- Env vars: `DRUPAL_ADMIN_USER`, `DRUPAL_ADMIN_PASS`
- Used for `drush site:install` and Drupal admin access

**JSON:API Access:**
- Anonymous read access (no authentication required)
- Drupal's JSON:API module exposes published content without auth tokens

**Cloudflare API:**
- API token-based auth for Pages deployment
- Env vars: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- Used by: `scripts/deploy-frontend.sh`, `.github/workflows/main.yml`

## Docker Integration

**DDEV:**
- Docker-based local development environment for Drupal
- Setup auto-detects Docker socket: checks `DOCKER_HOST` env, Colima, Docker context, or default `/var/run/docker.sock`
- Implementation: `resolveDockerEnv()` and `dockerInfoWorks()` in `setup/ui.js` (lines 161-245)
- DDEV configuration: `--project-type=drupal11 --php-version=8.3 --docroot=web`
- Docker Buildx required (checked as prerequisite)

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, etc.)

**Logs:**
- Console output only
- Setup wizard uses `@clack/prompts` spinners with elapsed-time display
- Audit toolkit outputs structured JSON reports to `audit/report/audit-report.json`

## CI/CD & Deployment

**Hosting:**
- Cloudflare Pages (static site)
- Drupal runs locally via DDEV (not deployed to production by this kit)

**CI Pipeline:**
- GitHub Actions (`.github/workflows/main.yml`)
- Triggers: push/PR to `main`
- Steps:
  1. Checkout
  2. Setup Node.js 20 with npm cache
  3. `npm ci` in `astro-frontend/`
  4. `npm run build` (requires `API_BASE_URL` secret for build-time Drupal fetch)
  5. Deploy to Cloudflare Pages via `cloudflare/pages-action@v1` (only on push to main)

## Environment Configuration

**Required env vars (for full operation):**
- `PROJECT_NAME` - Project identifier (drives DDEV hostname and Cloudflare project name)
- `DRUPAL_BASE_URL` - Drupal site URL
- `DRUPAL_JSONAPI_URL` - JSON:API endpoint URL
- `DRUPAL_ADMIN_USER` / `DRUPAL_ADMIN_PASS` - Drupal admin credentials

**Required for Cloudflare deployment:**
- `CLOUDFLARE_API_TOKEN` - Cloudflare API authentication
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account identifier

**Optional env vars:**
- `HOMEPAGE_ALIAS` - Drupal alias for homepage (default: `/home`)
- `API_BASE_URL` - Legacy alias (backward compatibility)
- `DRUPAL_API_URL` - Deprecated alias for `DRUPAL_JSONAPI_URL`
- `ENABLE_XDEBUG` / `ENABLE_MAILHOG` / `ENABLE_ADMINER` - Dev tool toggles (documented but not wired in setup)
- `PHP_MEMORY_LIMIT` / `PHP_MAX_EXECUTION_TIME` - PHP tuning (documented but not wired in setup)

**Secrets location:**
- `.env` file at project root (gitignored)
- GitHub Actions secrets (for CI/CD): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `API_BASE_URL`

**Env var flow:**
1. `.env.example` is the template (committed)
2. `setup/ui.js` copies `.env.example` → `.env`, then stamps project-specific values
3. `.env` is copied into `astro-frontend/.env` during Astro setup
4. Astro templates read env via `import.meta.env.*` at build time
5. A `scripts/run-astro.mjs` wrapper is generated to strip exported shell env vars so Astro's `.env` file takes precedence

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Audit System Integration

**The audit toolkit (`audit/`) validates integrations at runtime:**
- `audit:setup` - Checks .env, CLI prerequisites (ddev, docker, npm), directory structure
- `audit:api` - Tests JSON:API connectivity and deserialization with live Drupal
- `audit:static` - Verifies Astro is configured for static output (no SSR)
- `audit:pages` - Validates Cloudflare Pages configuration (wrangler.jsonc, deploy script)
- `audit:build` - Build contract validation
- `audit:ci` - CI/CD configuration audit
- `audit:docs` - Documentation drift detection
- Reports validated against JSON Schema: `specs/001-project-audit-optimization/contracts/audit-report.schema.json`

---

*Integration audit: 2026-03-11*
