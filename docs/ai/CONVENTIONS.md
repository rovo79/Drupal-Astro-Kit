# CONVENTIONS

## Repository Structure Conventions

- **Generated dirs are ignored in git**: `drupal-backend/`, `astro-frontend/` are created by setup and are listed in `.gitignore`.
- **Template source lives in `templates/`** and is copied into the generated Astro project by `setup/ui.js`.
- **Specs are treated as first-class**: feature specs and contracts live under `specs/` and are referenced by the audit toolkit (`audit/scripts/util/constants.js`).

## Naming & Validation

- **Project name** is validated to be lowercase letters, numbers, and hyphens (no underscores): `setup/ui.js` (`validateProjectName()`).
- **Env file stamping**: setup copies `.env.example` → `.env` if missing and appends derived values: `setup/ui.js`.

## Shell Script Style (repo-local pattern)

- Scripts use bash shebang and common helpers:
  - `#!/usr/bin/env bash`: `scripts/deploy-frontend.sh`, `scripts/seed-content.sh`
  - Color constants + `print_status`/`print_error` helpers: `scripts/deploy-frontend.sh`, `scripts/seed-content.sh`
  - `.env` loading pattern: `scripts/deploy-frontend.sh` (exports lines from `.env`)

## Setup CLI Patterns

- Uses Ink (React CLI) with step-based status UI: `setup/ui.js`
- Uses `execa` to run external tools (`ddev`, `docker`, `npm`, etc): `setup/ui.js`
- Designed to be non-interactive for subprocesses where possible (passes `stdin: 'ignore'`): `setup/ui.js`

## Astro Template Conventions (template source)

- **Routing**: single catch-all page route with `getStaticPaths()`:
  - `templates/astro-src/pages/[...slug].astro`
- **Data access**:
  - JSON:API fetch helper in `templates/astro-src/lib/drupal.ts` uses `jsona` + `drupal-jsonapi-params`
- **Layout**:
  - Shared page wrapper in `templates/astro-src/layouts/Base.astro`

## Documentation & Spec Conventions

- User-facing docs are in `docs/`.
- Feature requirements/contracts live in `specs/**/contracts/`.
- Audit output is written under `audit/report/` by `audit/index.js`.

## Assumptions

- The template code in `templates/astro-src/` is intended to be the canonical starting point for the generated `astro-frontend/src/`; confirm by inspecting the copy logic in `setup/ui.js` and verifying `astro-frontend/src/` contents post-setup.
- Script conventions (colors/helpers) apply to repo-provided scripts; generated projects may bring their own conventions depending on the chosen Astro template.

