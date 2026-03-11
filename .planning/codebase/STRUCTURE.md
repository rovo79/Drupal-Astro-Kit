# Codebase Structure

**Analysis Date:** 2026-03-11

## Directory Layout

```
Drupal_Astro_Kit/
├── setup.sh                    # Bash entry point — bootstraps and runs setup
├── setup/                      # Setup orchestration engine
│   ├── cli.js                  # Node shebang wrapper
│   ├── ui.js                   # Monolithic TUI orchestration (~1165 lines)
│   ├── package.json            # Setup-only dependencies
│   └── drupal-recipes/         # Drupal Recipe YAML bundles
│       ├── dak_decoupled_base/ # Base decoupled config (jsonapi, pathauto)
│       ├── dak_starter_content/# Sample content YAMLs (3 pages)
│       └── dak_structured_content/ # Optional Paragraphs content model
├── templates/                  # Source-of-truth Astro templates
│   └── astro-src/              # Copied into astro-frontend/src/ during setup
│       ├── lib/
│       │   └── drupal.ts       # JSON:API client with pagination
│       ├── pages/
│       │   ├── index.astro     # Homepage route (HOMEPAGE_ALIAS resolution)
│       │   └── [...slug].astro # Catch-all static route generator
│       └── layouts/
│           └── Base.astro      # Shared HTML layout (head, nav, footer)
├── scripts/                    # Operational scripts
│   ├── deploy-frontend.sh      # Build + deploy to Cloudflare Pages
│   ├── seed-content.sh         # Create 3 sample Drupal pages
│   └── setup-mcp.sh            # Empty placeholder
├── audit/                      # Self-contained audit toolkit
│   ├── index.js                # CLI entry point and report aggregator
│   ├── package.json            # Audit-only dependencies
│   ├── report/                 # Generated audit reports (JSON)
│   └── scripts/                # Collector modules and utilities
│       ├── setup_audit.js      # Setup health check
│       ├── jsonapi_audit.js    # JSON:API connectivity check
│       ├── static_config_audit.js  # Astro static config check
│       ├── pages_config_audit.js   # Cloudflare Pages config check
│       ├── build_contract_audit.js # Build output validation
│       ├── ci_cd_audit.js      # GitHub Actions workflow check
│       ├── docs_drift_audit.js # Documentation drift detection
│       ├── generate-report.js  # Markdown report generator
│       ├── check_env.js        # Environment variable checker
│       └── util/               # Shared audit utilities
│           ├── constants.js    # Paths, targets, severity levels
│           ├── jsonapiClient.js# Reusable JSON:API client
│           ├── schemaValidate.js# AJV schema validator
│           ├── workflowParser.js# GitHub Actions YAML parser
│           └── docsExtractor.js # Markdown path reference verifier
├── specs/                      # Feature specifications with contracts
│   ├── 001-project-audit-optimization/
│   │   ├── spec.md             # Feature spec
│   │   ├── plan.md             # Implementation plan
│   │   ├── tasks.md            # Task breakdown
│   │   ├── contracts/
│   │   │   └── audit-report.schema.json  # JSON Schema for audit reports
│   │   └── checklists/         # Verification checklists
│   ├── 002-drupal-api-config/
│   │   ├── spec.md, plan.md, tasks.md
│   │   └── contracts/
│   │       └── openapi.yaml    # OpenAPI contract for Drupal API
│   └── 003-static-ssg-refactor/
│       ├── spec.md, plan.md, tasks.md
│       └── contracts/
│           ├── jsonapi-page.md # JSON:API page response contract
│           └── pagination.md   # Pagination contract
├── docs/                       # Project documentation
│   ├── ai/                     # AI-maintained maps (CODEBASE_MAP.md, etc.)
│   ├── architecture.md         # Architecture overview
│   ├── deployment.md           # Deployment guide
│   ├── troubleshooting.md      # Troubleshooting guide
│   ├── cloudflare-setup.md     # Legacy Phase 2 (SSR-era, not current)
│   ├── github-actions.md       # Legacy Phase 2
│   ├── ssr-guide.md            # Legacy Phase 2
│   └── phase-2-workers-ssr.md  # Legacy Phase 2
├── .github/                    # GitHub configuration
│   ├── workflows/
│   │   └── main.yml            # CI/CD: build + deploy to Cloudflare Pages
│   ├── agents/                 # GitHub Copilot agent config
│   ├── copilot-instructions.md # GitHub Copilot instructions
│   └── prompts/                # GitHub Copilot prompts
├── .env.example                # Canonical env var template (committed)
├── .env.template               # Workspace path template
├── .gitignore                  # Excludes drupal-backend/, astro-frontend/, .env
├── AGENTS.md                   # Agent instructions for AI assistants
├── README.md                   # Project overview
├── Drupal_Astro_Kit.code-workspace # VS Code workspace config
├── repomix.config.json         # Repomix config for codebase export
├── memory.json                 # Local agent memory (not committed)
├── _verify/                    # Verification artifacts
├── .planning/                  # Planning documents (this directory)
│   └── codebase/               # Codebase analysis docs
├── drupal-backend/             # GENERATED (gitignored) — Drupal 11 in DDEV
└── astro-frontend/             # GENERATED (gitignored) — Astro SSG frontend
```

## Directory Purposes

**`setup/`:**
- Purpose: Everything needed to scaffold both backend and frontend projects
- Contains: Node.js CLI with interactive TUI, Drupal Recipe YAML bundles
- Key files: `ui.js` (main engine), `cli.js` (entry point), `drupal-recipes/*/recipe.yml`

**`setup/drupal-recipes/`:**
- Purpose: Declarative Drupal configuration applied during setup
- Contains: 3 recipe directories, each with `recipe.yml` + config/content YAML files
- Key files:
  - `dak_decoupled_base/recipe.yml` — Installs jsonapi, path, pathauto
  - `dak_decoupled_base/config/install/pathauto.pattern.page.yml` — URL alias pattern for pages
  - `dak_starter_content/recipe.yml` — Imports default_content module + starter pages
  - `dak_structured_content/recipe.yml` — Optional Paragraphs: headless_page type, section_rich_text, section_callout paragraph types
  - `dak_structured_content/config/install/` — 12 field/entity config YAMLs

**`templates/astro-src/`:**
- Purpose: Source-of-truth Astro templates that get copied verbatim into generated frontend
- Contains: TypeScript library, Astro pages, layout component
- Key files: `lib/drupal.ts` (JSON:API client), `pages/[...slug].astro` (route generator), `pages/index.astro` (homepage), `layouts/Base.astro` (HTML shell)

**`scripts/`:**
- Purpose: Operational shell scripts for deployment and content management
- Contains: Bash scripts
- Key files: `deploy-frontend.sh` (Cloudflare deploy), `seed-content.sh` (Drupal content seeder)

**`audit/`:**
- Purpose: Self-contained project health checker with standardized JSON reports
- Contains: Node.js CLI, 7 collector modules, shared utilities, report output
- Key files: `index.js` (CLI entry point), `scripts/util/constants.js` (project paths + config)

**`specs/`:**
- Purpose: Feature specifications with machine-readable contracts
- Contains: 3 numbered feature specs, each with spec/plan/tasks docs and contract files
- Key files: `001-project-audit-optimization/contracts/audit-report.schema.json` (validates audit output)

**`docs/`:**
- Purpose: Human-readable project documentation
- Contains: Architecture, deployment, troubleshooting guides; legacy SSR-era docs (Phase 2)
- Key files: `docs/ai/CODEBASE_MAP.md` (start here for orientation), `docs/ai/COMMANDS.md` (common commands)

**`docs/ai/`:**
- Purpose: AI-maintained documentation maps and analysis
- Contains: 9 markdown files covering architecture, stack, conventions, testing, security, hotspots
- Key files: All files serve as AI agent orientation material

## Key File Locations

**Entry Points:**
- `setup.sh`: Primary user-facing entry point to run the generator
- `setup/cli.js`: Node.js entry point for setup engine
- `setup/ui.js`: Main orchestration logic (default export `run()` function)
- `audit/index.js`: Audit toolkit CLI entry point

**Configuration:**
- `.env.example`: Canonical environment variable definitions (PROJECT_NAME, DRUPAL_BASE_URL, DRUPAL_JSONAPI_URL, API_BASE_URL, HOMEPAGE_ALIAS, CLOUDFLARE_* vars)
- `.env.template`: Workspace path template (WORKSPACE_ROOT, MEMORY_FILE_PATH)
- `setup/package.json`: Setup engine dependencies (@clack/prompts, execa, picocolors)
- `audit/package.json`: Audit toolkit dependencies (ajv, chalk, yargs, js-yaml)
- `.github/workflows/main.yml`: CI/CD pipeline definition

**Core Logic:**
- `setup/ui.js`: Generator orchestration — prerequisites, prompts, 11-step setup, Docker resolution, recipe application
- `templates/astro-src/lib/drupal.ts`: JSON:API client (paginated fetch, alias normalization, homepage resolution)
- `templates/astro-src/pages/[...slug].astro`: Static route generation from Drupal page aliases
- `templates/astro-src/pages/index.astro`: Homepage resolution (alias `/` preferred, fallback to HOMEPAGE_ALIAS)
- `scripts/seed-content.sh`: Inline PHP content seeder (runs inside DDEV container)

**Contracts:**
- `specs/001-project-audit-optimization/contracts/audit-report.schema.json`: JSON Schema for audit reports
- `specs/002-drupal-api-config/contracts/openapi.yaml`: OpenAPI contract for Drupal API
- `specs/003-static-ssg-refactor/contracts/jsonapi-page.md`: JSON:API page response contract
- `specs/003-static-ssg-refactor/contracts/pagination.md`: Pagination contract

## Naming Conventions

**Files:**
- JavaScript/TypeScript: `camelCase.js` / `camelCase.ts` for source files (e.g., `drupal.ts`, `jsonapiClient.js`)
- Audit collectors: `snake_case_audit.js` pattern (e.g., `setup_audit.js`, `ci_cd_audit.js`)
- Shell scripts: `kebab-case.sh` (e.g., `deploy-frontend.sh`, `seed-content.sh`)
- Astro components: `PascalCase.astro` for layouts (e.g., `Base.astro`), `kebab-case.astro` or Astro conventions for pages
- Config YAML: Drupal convention `module.type.name.yml` (e.g., `field.storage.node.field_sections.yml`)
- Drupal recipes: `snake_case` directory names with `dak_` prefix (e.g., `dak_decoupled_base`)

**Directories:**
- `kebab-case` for most directories (e.g., `astro-src`, `drupal-recipes`)
- `snake_case` for Drupal recipe directories (Drupal convention)
- Numbered specs: `NNN-kebab-case` (e.g., `001-project-audit-optimization`)

## Where to Add New Code

**New Setup Step:**
- Add step definition to `STEP_TEXTS` array in `setup/ui.js`
- Implement step logic inside `runSetup()` function in `setup/ui.js`
- Update `createStepRunner(STEP_TEXTS.length)` if total step count changes

**New Drupal Recipe:**
- Create directory in `setup/drupal-recipes/` with `dak_` prefix
- Add `recipe.yml` with install/config sections
- Place config YAML in `config/install/` subdirectory
- Register recipe in `recipeDirs` array inside `runSetup()` in `setup/ui.js`
- Add any required `composer require` packages to `composerRequires` array in `setup/ui.js`

**New Astro Template File:**
- Add file to `templates/astro-src/` in the appropriate subdirectory
- Pages go in `templates/astro-src/pages/`
- Components go in `templates/astro-src/layouts/` (or create `templates/astro-src/components/`)
- Library code goes in `templates/astro-src/lib/`
- Files are copied verbatim to `astro-frontend/src/` during setup

**New Audit Collector:**
- Create `scripts/<target_name>_audit.js` in `audit/scripts/`
- Export `run()` function returning `{ findings, recommendations, gateResults, diagnostics, metadata }`
- Register module path in `COLLECTOR_MODULES` map in `audit/index.js`
- Add target name to `AUDIT_TARGETS` enum in `audit/scripts/util/constants.js`
- Add npm script to `audit/package.json`: `"audit:<target>": "node ./index.js --target <target>"`

**New Operational Script:**
- Add to `scripts/` directory
- Use `kebab-case.sh` naming
- Load `.env` from repo root at top of script
- Make executable: `chmod +x scripts/new-script.sh`

**New Feature Spec:**
- Create numbered directory in `specs/` (e.g., `004-feature-name/`)
- Include at minimum: `spec.md`, `plan.md`, `tasks.md`
- Add `contracts/` subdirectory for machine-readable contracts (JSON Schema, OpenAPI)

**New Documentation:**
- Human docs go in `docs/`
- AI-maintained maps go in `docs/ai/`
- Planning/analysis docs go in `.planning/codebase/`

## Special Directories

**`drupal-backend/`:**
- Purpose: Generated Drupal 11 project (DDEV-managed)
- Generated: Yes (by `setup.sh`)
- Committed: No (gitignored)

**`astro-frontend/`:**
- Purpose: Generated Astro SSG frontend project
- Generated: Yes (by `setup.sh`)
- Committed: No (gitignored)

**`audit/report/`:**
- Purpose: Generated audit report output (JSON)
- Generated: Yes (by audit toolkit)
- Committed: No (generated at runtime)

**`setup/node_modules/`:**
- Purpose: Setup engine dependencies
- Generated: Yes (by npm install)
- Committed: No (gitignored)

**`.planning/`:**
- Purpose: Codebase analysis documents for AI-assisted planning
- Generated: Yes (by codebase mapper agents)
- Committed: Yes (useful for planning reference)

**`_verify/`:**
- Purpose: Verification artifacts
- Generated: Varies
- Committed: Yes

**`.agent/`, `skills/`, `.sisyphus/`:**
- Purpose: Local agent/tooling artifacts
- Generated: Yes
- Committed: No (gitignored)

---

*Structure analysis: 2026-03-11*
