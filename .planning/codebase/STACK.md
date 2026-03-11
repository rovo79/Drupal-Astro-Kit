# Technology Stack

**Analysis Date:** 2026-03-11

## Languages

**Primary:**
- JavaScript (ES Modules) - Setup orchestration (`setup/ui.js`, `setup/cli.js`), audit toolkit (`audit/index.js`, `audit/scripts/**`)
- TypeScript - Astro template source (`templates/astro-src/lib/drupal.ts`)
- Bash - Shell scripts (`setup.sh`, `scripts/deploy-frontend.sh`, `scripts/seed-content.sh`)

**Secondary:**
- PHP - Inline PHP within seed content script (`scripts/seed-content.sh` embeds Drupal entity creation via `drush php:script`)
- YAML - Drupal recipe definitions (`setup/drupal-recipes/**/recipe.yml`, `setup/drupal-recipes/**/config/install/*.yml`)
- Astro (.astro) - Page/layout templates (`templates/astro-src/pages/*.astro`, `templates/astro-src/layouts/Base.astro`)

## Runtime

**Environment:**
- Node.js >=20.3.0 (setup requires Node 20+; generated Astro frontend requires `^20.3.0 || >=22.0.0`)

**Package Manager:**
- npm (used in both `setup/` and `audit/` packages)
- Lockfile: Present in both `setup/package-lock.json` and `audit/package-lock.json`
- Composer (PHP) - Used at setup time to scaffold Drupal (`composer create-project drupal/recommended-project:^11`)

**Module System:**
- ESM throughout (`"type": "module"` in both `setup/package.json` and `audit/package.json`)

## Frameworks

**This is a generator repo.** It does not run as an app itself. It generates two projects:

**Setup Orchestration (this repo):**
- No framework — pure Node.js CLI with `@clack/prompts` for interactive TUI

**Generated Drupal Backend:**
- Drupal 11 (via `drupal/recommended-project:^11`)
- DDEV (local Docker-based dev environment, configured as `--project-type=drupal11 --php-version=8.3`)
- Drush (Drupal CLI, installed via `composer require drush/drush`)

**Generated Astro Frontend:**
- Astro 5.18.0 (`ASTRO_PACKAGE_VERSION` in `setup/ui.js` line 24)
- `create astro@4.13.2` used as project scaffolder (`ASTRO_CREATE_VERSION` in `setup/ui.js` line 23)
- Static output mode (`output: 'static'` in generated `astro.config.mjs`)

**Audit Toolkit:**
- No framework — custom Node.js CLI with `yargs` for argument parsing

**Build/Dev:**
- Wrangler (Cloudflare CLI) - installed as devDependency in generated frontend, used for Pages deployment

## Key Dependencies

### Setup Package (`setup/package.json`)

**Critical:**
- `@clack/prompts` ^0.11.0 (locked 0.11.0) - Interactive terminal prompts for setup wizard
- `execa` ^9.6.0 (locked 9.6.0) - Process execution (runs ddev, docker, composer, npm commands)
- `picocolors` ^1.1.1 (locked 1.1.1) - Terminal color output

### Audit Package (`audit/package.json`)

**Critical:**
- `ajv` ^8.17.1 - JSON Schema validation (validates audit report against `specs/001-project-audit-optimization/contracts/audit-report.schema.json`)
- `ajv-formats` ^3.0.1 - Format validators for Ajv (date-time, etc.)
- `chalk` ^5.3.0 - Terminal color output
- `drupal-jsonapi-params` ^3.0.0 - Builds Drupal JSON:API query strings
- `jsona` ^1.12.1 - Deserializes JSON:API responses into plain objects
- `yargs` ^17.7.2 - CLI argument parsing
- `js-yaml` ^4.1.0 - YAML parsing (used in docs drift audit)

### Generated Frontend Dependencies (installed by setup)

**Installed at setup time into `astro-frontend/`:**
- `astro` 5.18.0 - Static site generator
- `jsona` - JSON:API deserialization (same as audit)
- `drupal-jsonapi-params` - JSON:API query building (same as audit)
- `tslib` 2.6.2 - TypeScript runtime helpers
- `wrangler` (devDependency) - Cloudflare CLI for Pages deployment

### External CLI Tools (prerequisites)

**Required on host machine:**
- `docker` - Container runtime (Docker Desktop or Colima)
- `docker buildx` - Docker build extension (required by DDEV)
- `ddev` - Local development environment for Drupal
- `composer` - PHP dependency manager
- `npm` / `npx` - Node package management
- `node` - Node.js runtime (>=20)

## Configuration

**Environment:**
- `.env` file at project root (gitignored) - generated from `.env.example` by setup
- `.env.example` - template with all supported variables and documentation
- `.env.template` - minimal template for workspace root and memory file paths

**Key Environment Variables:**
- `PROJECT_NAME` - Used to derive DDEV site URL and Cloudflare project name
- `DRUPAL_BASE_URL` - e.g., `http://{project}.ddev.site`
- `DRUPAL_JSONAPI_URL` - e.g., `http://{project}.ddev.site/jsonapi`
- `API_BASE_URL` - Legacy alias for `DRUPAL_BASE_URL`
- `DRUPAL_API_URL` - Deprecated alias for `DRUPAL_JSONAPI_URL`
- `HOMEPAGE_ALIAS` - Drupal path alias that maps to `/` in Astro (default: `/home`)
- `CLOUDFLARE_ACCOUNT_ID` - For Pages deployment
- `CLOUDFLARE_API_TOKEN` - For Pages deployment
- `DRUPAL_ADMIN_USER` / `DRUPAL_ADMIN_PASS` - Drupal admin credentials

**Build:**
- `astro.config.mjs` - Generated in `astro-frontend/` with `output: 'static'` and `site` URL
- `wrangler.jsonc` - Generated in `astro-frontend/` with Pages configuration
- `repomix.config.json` - Code context bundler configuration (at project root)

**Editor:**
- `.vscode/settings.json` - VS Code workspace settings (Copilot prompt recommendations)
- `.vscode/tasks.json` - VS Code tasks
- `Drupal_Astro_Kit.code-workspace` - VS Code workspace file

## Drupal Recipes

**Custom Drupal recipes ship with the generator in `setup/drupal-recipes/`:**

- `dak_decoupled_base/` - Baseline: enables jsonapi, path, pathauto modules; sets up URL alias pattern for pages
- `dak_starter_content/` - Seeds sample Basic Pages with stable aliases (/home, /about, /contact) via default_content module
- `dak_structured_content/` (optional) - Adds Paragraphs-based structured content: headless_page content type with section_rich_text and section_callout paragraph types

**Drupal modules installed by setup:**
- `jsonapi` (core) - Exposes content as JSON:API
- `path` (core) - URL path aliases
- `pathauto` (contrib) - Automatic URL alias generation
- `default_content` ^2.0@beta (contrib) - Content import/export
- `paragraphs` (contrib, optional) - Structured content
- `entity_reference_revisions` (contrib, optional) - Required by Paragraphs

## Platform Requirements

**Development:**
- macOS or Linux (shell scripts assume Unix)
- Docker Desktop or Colima running
- DDEV installed
- Composer installed
- Node.js 20+
- npm

**Production (generated frontend):**
- Cloudflare Pages (static hosting)
- No runtime server required — static HTML output from Astro build
- Drupal must be accessible at build time for content fetching

---

*Stack analysis: 2026-03-11*
