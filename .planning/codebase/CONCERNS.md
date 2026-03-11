# Codebase Concerns

**Analysis Date:** 2026-03-11

## Tech Debt

**`setup/ui.js` is a 1165-line monolith:**
- Issue: All setup logic lives in a single file: Docker detection, DDEV management, Drupal scaffolding, Astro setup, env file management, recipe application, content seeding. No separation of concerns.
- Files: `setup/ui.js`
- Impact: Hard to maintain, test, or extend. Every change risks side effects across unrelated functionality. Contributors must understand the entire file to modify any part.
- Fix approach: Extract into focused modules: `setup/lib/docker.js`, `setup/lib/ddev.js`, `setup/lib/drupal.js`, `setup/lib/astro.js`, `setup/lib/env.js`. Keep `ui.js` as orchestrator that calls into these modules.

**Hardcoded version pins will become stale:**
- Issue: `ASTRO_CREATE_VERSION = '4.13.2'`, `ASTRO_PACKAGE_VERSION = '5.18.0'`, `tslib: '2.6.2'` are pinned inline in setup logic with no update mechanism.
- Files: `setup/ui.js` (lines ~15-20)
- Impact: Users get outdated Astro versions. Manual intervention required to bump. No automated staleness detection.
- Fix approach: Move version pins to a dedicated `setup/versions.json` or `setup/constants.js`. Add a CI check or Renovate/Dependabot config to flag when upstream releases new versions.

**Redundant env vars for API URL:**
- Issue: Three overlapping vars serve similar purposes: `DRUPAL_API_URL` (deprecated), `DRUPAL_JSONAPI_URL`, `API_BASE_URL`. Templates have fallback chains like `import.meta.env.DRUPAL_JSONAPI_URL || import.meta.env.API_BASE_URL`.
- Files: `setup/ui.js`, `.env.example`, `.env.template`, `templates/astro-src/lib/drupal.ts`
- Impact: Confusing for users. Easy to set the wrong var and get silent failures. Fallback chains mask misconfiguration.
- Fix approach: Consolidate to a single canonical var (`DRUPAL_JSONAPI_URL`). Remove `DRUPAL_API_URL` and `API_BASE_URL`. Update all templates and docs.

**`_verify/repo/` is a near-complete repo duplicate:**
- Issue: Contains a snapshot of the entire repo (setup/, templates/, scripts/, docs/, audit/) that is NOT gitignored. Adds significant repo bloat.
- Files: `_verify/repo/**`
- Impact: Doubles maintenance burden. Changes to source files are not reflected in `_verify/repo/`. Confusing for contributors who may edit the wrong copy.
- Fix approach: Either gitignore `_verify/repo/` or replace with a CI-based verification approach that clones the repo fresh.

**Dual content seeding creates potential conflicts:**
- Issue: `scripts/seed-content.sh` creates pages via an inline PHP script using Drupal's entity API, while the `dak_starter_content` recipe also contains content YAML files. Both attempt to create initial content.
- Files: `scripts/seed-content.sh`, `setup/drupal-recipes/dak_starter_content/content/**`
- Impact: Running both paths can create duplicate content or fail on unique constraint violations. Unclear which is the canonical seeding mechanism.
- Fix approach: Choose one seeding strategy. Prefer the recipe-based approach (declarative, version-controlled YAML) and remove the PHP-based script, or vice versa.

**`setup/package.json` has dead `"main": "index.js"` reference:**
- Issue: `"main"` field points to `index.js` which does not exist. The actual entry point is `cli.js`.
- Files: `setup/package.json`
- Impact: Minor — `npm` will look for a nonexistent file if the package is required. Does not affect normal `node cli.js` invocation.
- Fix approach: Change `"main"` to `"cli.js"` or remove the field entirely.

**Recipe application uses 6 fallback attempts:**
- Issue: Each Drupal recipe is attempted with 6 different command variations (lines ~731-762 of `ui.js`): `ddev drush recipe`, `ddev exec php core/scripts/drupal recipe`, etc. Suggests unstable Drupal recipe CLI.
- Files: `setup/ui.js` (recipe application section)
- Impact: Slow setup when early attempts fail. Silent swallowing of errors from failed attempts. Hard to debug which method actually worked.
- Fix approach: Detect Drupal/Drush version once, select the correct recipe command, and use only that. Add clear error reporting if the selected method fails.

**No test suite exists:**
- Issue: `setup/package.json` has `"test": "echo \"Error: no test specified\" && exit 1"`. No unit, integration, or snapshot tests for any setup logic.
- Files: `setup/package.json`
- Impact: All validation is manual end-to-end. Refactoring `setup/ui.js` is high-risk with no safety net. Regressions go undetected until a user runs `./setup.sh`.
- Fix approach: Add at minimum: unit tests for pure functions (env parsing, version detection), integration tests for Docker/DDEV detection logic (mockable), snapshot tests for generated file contents.

## Known Bugs

**CI workflow caches a gitignored file:**
- Symptoms: GitHub Actions cache for `astro-frontend/package-lock.json` always misses because this file is in `.gitignore` (generated output). CI falls back to uncached installs every run.
- Files: `.github/workflows/main.yml`
- Trigger: Every CI run.
- Workaround: None — CI still works, just slower than necessary.

**`scripts/setup-mcp.sh` is an empty file:**
- Symptoms: Script exists but contains no code. Referenced nowhere visible but occupies space in `scripts/`.
- Files: `scripts/setup-mcp.sh`
- Trigger: Any attempt to run the script.
- Workaround: N/A — dead file, should be removed or implemented.

## Security Considerations

**Default admin credentials `admin/admin`:**
- Risk: Setup prompts default to username `admin` and password `admin`. Users who accept defaults get a Drupal site with trivially guessable credentials.
- Files: `setup/ui.js` (credential prompts), `.env.example`
- Current mitigation: `.env.example` documents these as defaults. DDEV sites are local-only by default.
- Recommendations: Add password strength validation. Generate a random default password and display it. Warn users explicitly about weak credentials.

**Unsafe env file loading in deploy script:**
- Risk: `export $(grep -v '^#' .env | xargs)` breaks on values containing spaces, quotes, or special characters. Can cause partial/incorrect env loading or command injection.
- Files: `scripts/deploy-frontend.sh`
- Current mitigation: None.
- Recommendations: Use `source .env` with proper quoting, or use `dotenv` CLI tool, or parse with a proper env file parser. At minimum, quote the expansion.

**`.env` file contains real project values:**
- Risk: `.env` is in `.gitignore` but the repo contains a `.env` with real project name values (`dakblue`). If someone forks or clones, they get someone else's config.
- Files: `.env`
- Current mitigation: `.gitignore` lists `.env`.
- Recommendations: Verify `.env` is truly gitignored (not tracked). If tracked, remove from git history. Ensure `.env.example` and `.env.template` are the only committed env files.

## Performance Bottlenecks

**Recipe fallback chain is slow on failure:**
- Problem: When the first recipe application method fails, setup tries 5 more methods sequentially. Each attempt involves spawning a DDEV/Docker command that may take 5-15 seconds to fail.
- Files: `setup/ui.js` (recipe application section)
- Cause: Lack of upfront detection of which recipe CLI is available.
- Improvement path: Probe once for the correct recipe command (e.g., `ddev drush --version` or check Drupal core version), cache the result, and use only the known-working method.

**No build caching for Astro in CI:**
- Problem: CI workflow does a full `npm install` and `npm run build` without caching node_modules or Astro build artifacts.
- Files: `.github/workflows/main.yml`
- Cause: Cache key references gitignored `astro-frontend/package-lock.json`.
- Improvement path: Fix the cache key to reference a committed file, or generate the lockfile as a CI step before caching.

## Fragile Areas

**Docker socket detection (`resolveDockerEnv()`):**
- Files: `setup/ui.js` (lines ~85-130)
- Why fragile: Complex fallback chain: checks `DOCKER_HOST` env var, probes Colima socket, queries `docker context inspect`, falls back to default socket. Each step has a silent `catch {}` that swallows errors.
- Safe modification: Add logging/tracing for each detection step. Test with Docker Desktop, Colima, Orbstack, and Rancher Desktop.
- Test coverage: None.

**DDEV project name detection (`getDdevProject()`):**
- Files: `setup/ui.js` (lines ~150-200)
- Why fragile: Checks 8 different JSON property names for the project name (`name`, `project`, `project_name`, etc.). Suggests DDEV's `describe --json-output` format has changed across versions.
- Safe modification: Pin to specific DDEV version range. Add version detection and branch logic accordingly.
- Test coverage: None.

**`setup.sh` relies on `cd setup` relative path:**
- Files: `setup.sh`
- Why fragile: Script does `cd setup` which fails if invoked from a directory other than the repo root. No guard to verify current directory.
- Safe modification: Add `SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"` and `cd "$SCRIPT_DIR/setup"`.
- Test coverage: None.

**`moveDirContents()` is non-atomic:**
- Files: `setup/ui.js`
- Why fragile: Deletes destination files before renaming source files into place. If the process crashes mid-operation, destination files are deleted but source files haven't been moved, resulting in data loss.
- Safe modification: Copy first, verify, then delete originals. Or use a temporary directory as a staging area.
- Test coverage: None.

## Scaling Limits

**Single-site architecture:**
- Current capacity: Setup generates one Drupal backend and one Astro frontend per run.
- Limit: No support for multi-site, multi-language, or multi-environment configurations without manual duplication.
- Scaling path: Add environment profiles (dev/staging/prod) to `.env` management. Consider multi-site support as a future feature.

## Dependencies at Risk

**`@clack/prompts` (setup CLI):**
- Risk: Low — actively maintained, but the setup wizard is tightly coupled to its API.
- Impact: If the API changes, the entire interactive setup flow breaks.
- Migration plan: Abstract prompt calls behind a thin wrapper to enable swapping prompt libraries.

**Drupal recipe CLI stability:**
- Risk: High — the 6-fallback approach in `setup/ui.js` indicates the Drupal recipe CLI interface is not yet stable across Drupal versions.
- Impact: New Drupal releases may break recipe application entirely.
- Migration plan: Track Drupal core recipe CLI stabilization. Once stable, remove fallback chain and use canonical command.

## Missing Critical Features

**No rollback/undo for setup:**
- Problem: If `./setup.sh` fails partway through (e.g., after creating DDEV project but before Astro setup), there is no cleanup or rollback. User must manually delete `drupal-backend/` and DDEV project.
- Blocks: Reliable CI-based testing of setup flow. User confidence in re-running setup after failure.

**No update/upgrade path:**
- Problem: Once a project is generated, there is no mechanism to apply upstream template changes to an existing `astro-frontend/` or `drupal-backend/`.
- Blocks: Users staying current with template improvements, security patches, or dependency updates.

## Test Coverage Gaps

**Setup logic is entirely untested:**
- What's not tested: All functions in `setup/ui.js` — Docker detection, DDEV management, file operations, env file generation, recipe application, Astro project creation.
- Files: `setup/ui.js`, `setup/cli.js`
- Risk: Any refactoring of the monolithic `setup/ui.js` could introduce regressions with no automated detection.
- Priority: High

**Template output is not validated:**
- What's not tested: Generated files in `templates/astro-src/` are not checked for correctness against Astro's expected structure. No snapshot tests for generated `astro.config.mjs`, `drupal.ts`, page templates.
- Files: `templates/astro-src/**`
- Risk: Template changes could produce invalid Astro projects that only fail at build time.
- Priority: Medium

**Audit scripts have incomplete coverage:**
- What's not tested: `audit/scripts/jsonapi_audit.js` has TODO comments for performance audit (T027) and security audit (T028).
- Files: `audit/scripts/jsonapi_audit.js` (lines 262-263)
- Risk: JSON:API performance and security issues go undetected.
- Priority: Medium

**Deploy script is untested:**
- What's not tested: `scripts/deploy-frontend.sh` — env loading, wrangler invocation, error handling.
- Files: `scripts/deploy-frontend.sh`
- Risk: Deployment failures in production with no prior automated validation.
- Priority: Medium

---

*Concerns audit: 2026-03-11*
