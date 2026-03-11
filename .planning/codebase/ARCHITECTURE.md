# Architecture

**Analysis Date:** 2026-03-11

## Pattern Overview

**Overall:** Generator / Scaffolding Tool

This is **not** an application — it is a project generator. Running `./setup.sh` produces two gitignored output projects (`drupal-backend/` and `astro-frontend/`). The repo contains setup orchestration, Drupal recipes, Astro template source files, deployment scripts, and an audit toolkit.

**Key Characteristics:**
- Single-run generator that produces a Drupal 11 + Astro SSG stack
- Static-first architecture: Drupal serves JSON:API at build time, Astro emits static HTML, Cloudflare Pages serves the output
- No runtime dependency on Drupal after build
- Monolithic setup engine (`setup/ui.js`, ~1165 lines) with interactive TUI
- Template-copy model: source templates in `templates/astro-src/` are copied into the generated `astro-frontend/src/` directory
- Drupal configuration via Drupal Recipes (YAML-based config import), not traditional config sync

## Layers

**Setup Orchestration Layer:**
- Purpose: Interactive CLI that scaffolds both backend and frontend projects
- Location: `setup/`
- Contains: `cli.js` (Node shebang wrapper), `ui.js` (monolithic orchestration engine), `package.json` (dependencies)
- Depends on: `@clack/prompts` (TUI), `execa` (subprocess), `picocolors` (terminal styling), DDEV CLI, Composer CLI, Docker CLI
- Used by: `setup.sh` (bash entry point)

**Drupal Recipe Layer:**
- Purpose: Declarative Drupal configuration bundles applied during setup
- Location: `setup/drupal-recipes/`
- Contains: 3 recipes with `recipe.yml` files and config/content YAML
- Depends on: Drupal 11 recipe system, contrib modules (pathauto, default_content, paragraphs)
- Used by: `setup/ui.js` (copies recipes into `drupal-backend/web/recipes/dak/` then applies them)

**Astro Template Layer:**
- Purpose: Source-of-truth Astro components copied into generated frontend
- Location: `templates/astro-src/`
- Contains: TypeScript client library, Astro page routes, layout component
- Depends on: `jsona` (JSON:API deserialization), `drupal-jsonapi-params` (query building)
- Used by: `setup/ui.js` (copies into `astro-frontend/src/` during setup step)

**Script Layer:**
- Purpose: Operational scripts for deployment and content seeding
- Location: `scripts/`
- Contains: `deploy-frontend.sh` (Cloudflare Pages deploy), `seed-content.sh` (Drupal content seeder), `setup-mcp.sh` (empty placeholder)
- Depends on: `.env` vars, DDEV CLI, npm/npx, wrangler
- Used by: `setup/ui.js` calls `seed-content.sh` during recipe application; `deploy-frontend.sh` is run manually

**Audit Toolkit Layer:**
- Purpose: Non-mutating project health checks with schema-validated reports
- Location: `audit/`
- Contains: CLI entry point (`index.js`), 7 collector modules, shared utilities, JSON schema validation
- Depends on: `ajv` (schema validation), `chalk`, `yargs`, `js-yaml`, `jsona`, `drupal-jsonapi-params`
- Used by: Developers run manually via `cd audit && npm run audit:all`

**Specification Layer:**
- Purpose: Feature specs with contracts that define expected API shapes
- Location: `specs/`
- Contains: 3 numbered feature specs, each with plan/spec/tasks docs and machine-readable contracts (JSON Schema, OpenAPI, markdown contracts)
- Depends on: Nothing at runtime
- Used by: Audit toolkit validates against `specs/001-project-audit-optimization/contracts/audit-report.schema.json`

**CI/CD Layer:**
- Purpose: Automated build and deployment pipeline
- Location: `.github/workflows/main.yml`
- Contains: Single GitHub Actions workflow
- Depends on: `astro-frontend/` (generated output must be committed or buildable in CI context)
- Used by: GitHub on push/PR to `main`

**Documentation Layer:**
- Purpose: Human and AI-readable project documentation
- Location: `docs/` (human docs), `docs/ai/` (AI-maintained maps)
- Contains: Architecture docs, troubleshooting, deployment guides, legacy SSR-era docs (Phase 2 — not current)
- Used by: Developers and AI agents

## Data Flow

**Setup Flow (Generator):**

1. User runs `./setup.sh` from repo root
2. `setup.sh` enters `setup/`, runs `npm install`, executes `cli.js`
3. `cli.js` imports and calls `ui.js`'s default export
4. `ui.js` checks prerequisites (Node 20+, Docker, DDEV, Buildx, Composer)
5. Interactive prompts collect: project name, admin credentials, Astro template, structured content toggle
6. Rerun detection checks for existing Drupal state (5 marker files + DDEV project list)
7. 11-step sequential execution:
   - Steps 1–2: Environment sync, Docker socket resolution
   - Steps 3–6: DDEV config, start, Composer create Drupal, Drush install
   - Steps 7–8: Drupal site install (with idempotency check via SQL query), recipe copy + Composer require
   - Step 9: Recipe application with 6-attempt fallback strategy, seed content via `scripts/seed-content.sh`
   - Step 10: Astro scaffolding (npm create astro, dependency patching, template copy, env wrapper generation)
   - Step 11: Completion summary with optional Astro dev handoff

**Build-Time Data Flow (Generated Projects):**

1. `astro-frontend/` runs `npm run build` (via `scripts/run-astro.mjs` wrapper that strips conflicting env vars)
2. Astro's `getStaticPaths()` in `[...slug].astro` calls `getAllPages()` from `lib/drupal.ts`
3. `drupal.ts` constructs JSON:API URL from env vars (`DRUPAL_BASE_URL` / `DRUPAL_JSONAPI_URL`)
4. Paginated fetch of all published `node--page` entities with field filtering (title, body, path, status, created, changed)
5. `jsona` deserializes JSON:API responses into typed `DrupalPage` objects
6. Routes generated from path aliases: `/about` → `dist/about/index.html`
7. Homepage resolved separately in `index.astro`: page with alias `/` preferred, fallback to `HOMEPAGE_ALIAS` (default `/home`)
8. Static HTML output written to `astro-frontend/dist/`

**Deployment Data Flow:**

1. `scripts/deploy-frontend.sh` loads `.env`, validates Cloudflare credentials
2. Runs `npm run build` in `astro-frontend/` (triggers build-time JSON:API fetch)
3. Deploys `astro-frontend/dist/` to Cloudflare Pages via `wrangler pages deploy`
4. Alternatively, `.github/workflows/main.yml` runs on push to main: checkout → npm ci → build → Cloudflare Pages action

**Audit Data Flow:**

1. `audit/index.js` parses `--target` arg, loads collector module(s)
2. Each collector returns `{ findings, recommendations, gateResults, diagnostics, metadata }`
3. Results merged into single report object
4. Report validated against `specs/001-project-audit-optimization/contracts/audit-report.schema.json` using AJV
5. JSON report written to `audit/report/audit-report.json`

**State Management:**
- No persistent application state in the generator repo itself
- `.env` file is the shared configuration state between setup, scripts, and generated projects
- Drupal state lives in DDEV-managed MySQL (inside `drupal-backend/`)
- Astro output is ephemeral static files in `dist/`

## Key Abstractions

**Step Runner (`createStepRunner` in `setup/ui.js`):**
- Purpose: Executes numbered setup steps with spinner UI, elapsed-time ticker, and contextual error messages
- Pattern: Higher-order function returning async step executor with `try/catch` that transforms errors via `toActionableError()`

**Drupal Rerun Detection (`detectDrupalRerunRisk` in `setup/ui.js`):**
- Purpose: Determines if a previous setup has left artifacts that require user decision (reset/reuse/cancel)
- Pattern: Checks 5 filesystem markers + DDEV project list; returns `{ hasRisk, hasDrupalDirState, hasDdevProject }`

**Docker Environment Resolution (`resolveDockerEnv` in `setup/ui.js`):**
- Purpose: Finds a working Docker socket across different local setups
- Pattern: Cascading fallback chain: `$DOCKER_HOST` env var → Colima status → Docker context inspect → default `/var/run/docker.sock`

**Recipe Application (`applyRecipe` in `setup/ui.js`):**
- Purpose: Applies a Drupal recipe using whatever Drush/core command variant works
- Pattern: 6-attempt fallback trying combinations of `drush recipe:apply`, `drush recipe`, and `php core/scripts/drupal recipe` with both path and name arguments

**JSON:API Client (`templates/astro-src/lib/drupal.ts`):**
- Purpose: Typed Drupal JSON:API client for build-time content fetching
- Pattern: Paginated fetch-all with `jsona` deserialization, env-var-based URL resolution with backward compatibility fallbacks (`API_BASE_URL` → `DRUPAL_BASE_URL`)

**Audit Collector Pattern (`audit/scripts/*.js`):**
- Purpose: Modular health check plugins with standardized output shape
- Pattern: Each module exports `run()` returning `{ findings, recommendations, gateResults, diagnostics, metadata }`

## Entry Points

**Primary Setup Entry:**
- Location: `setup.sh`
- Triggers: User runs `./setup.sh` manually
- Responsibilities: Bootstrap setup dependencies, delegate to `setup/cli.js`

**Setup CLI:**
- Location: `setup/cli.js`
- Triggers: Called by `setup.sh`
- Responsibilities: Import and run `setup/ui.js` default export, handle top-level errors

**Setup Engine:**
- Location: `setup/ui.js` (default export `run()`)
- Triggers: Called by `cli.js`
- Responsibilities: Interactive TUI, prerequisite checks, 11-step orchestration, project generation

**Audit CLI:**
- Location: `audit/index.js`
- Triggers: `npm run audit:all` or `node ./index.js --target <target>`
- Responsibilities: Load collectors, aggregate results, validate against schema, write report

**Deploy Script:**
- Location: `scripts/deploy-frontend.sh`
- Triggers: User runs manually
- Responsibilities: Build Astro, deploy to Cloudflare Pages

**Seed Content Script:**
- Location: `scripts/seed-content.sh`
- Triggers: Called by `setup/ui.js` during step 9, or run manually
- Responsibilities: Create 3 sample pages (Homepage, About, Contact) in Drupal via inline PHP

**CI Pipeline:**
- Location: `.github/workflows/main.yml`
- Triggers: Push/PR to `main` branch
- Responsibilities: Build Astro frontend, deploy to Cloudflare Pages (on push to main only)

## Error Handling

**Strategy:** Contextual, actionable error messages that tell users how to fix the problem

**Patterns:**
- `toActionableError()` in `setup/ui.js` maps step IDs to specific fix instructions (e.g., "Docker is not running. Start Docker Desktop or Colima, then re-run ./setup.sh")
- `firstErrorLine()` extracts the first non-empty line from error messages for concise display
- `fullErrorText()` preserves full error output for pattern matching (e.g., detecting "not empty|already exists" in Composer errors)
- Step runner catches errors, stops spinner with red ✗, then re-throws with actionable message
- Astro templates use try/catch around `checkApiConnection()` and `getAllPages()` with console error guidance
- Audit collectors return errors as diagnostics rather than crashing — individual collector failures don't prevent other collectors from running

## Cross-Cutting Concerns

**Logging:** Console output via `@clack/prompts` (spinners, notes, success/error messages) in setup; `console.log/warn/error` in Astro templates; `chalk` in audit toolkit
**Validation:** AJV schema validation for audit reports; `validateProjectName()` for project name constraints (no underscores, lowercase alphanumeric + hyphens only)
**Authentication:** Drupal admin credentials collected interactively with defaults (`admin/admin`); Cloudflare API token via `.env`
**Environment Variables:** Single `.env` file at repo root as source of truth; copied to `astro-frontend/.env` during setup; `scripts/run-astro.mjs` wrapper strips conflicting vars from shell environment before Astro reads its `.env` file

---

*Architecture analysis: 2026-03-11*
