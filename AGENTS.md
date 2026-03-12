# Drupal_Astro_Kit — Agent Instructions

## What this repo is

- This is a **generator repo** (tooling + templates), not the final app.
- This is a **static-first starter kit** for developers — not a platform, not an SSR framework, not an editorial CMS.
- Running `./setup.sh` generates two **gitignored** projects:
  - `drupal-backend/` (Drupal 11 in DDEV)
  - `astro-frontend/` (Astro SSG site)
- Prefer changing **source-of-truth files in this repo** (not generated output):
  - Setup orchestration: `setup/ui.js`, `setup/cli.js`, `setup.sh`
  - Astro template source: `templates/astro-src/**` (copied into `astro-frontend/src/**`)
  - Scripts: `scripts/**`
  - Specs/contracts: `specs/**`
  - Docs: `docs/**` and `docs/ai/**`

### What this repo is NOT

- Not an SSR framework — there is no server-side rendering, no Workers runtime, no edge rendering
- Not an editorial platform — Drupal is a local-only content source, not a hosted CMS
- Not a CI/CD pipeline — the default is local build + manual deploy

## Default architecture (static-first)

Drupal runs locally (DDEV) and exposes JSON:API. Astro fetches JSON:API **at build time** (`getStaticPaths()`), emits static HTML into `astro-frontend/dist/`, and Cloudflare Pages serves the static output.

## Golden rules

- **Do not commit secrets.**
  - `.env` is gitignored; treat it as local-only.
  - Use `.env.example` for defaults and documentation.
- **Do not “fix” issues by editing generated dirs** (`drupal-backend/`, `astro-frontend/`) unless the task is explicitly about generated output. Fix the template/setup source instead.
- **Keep env-var contracts consistent** across:
  - `.env.example`
  - `setup/ui.js` (stamps/derives vars)
  - `templates/astro-src/**` (reads vars via `import.meta.env`)
- **Static-first is the default.** Avoid reintroducing SSR/Workers assumptions unless explicitly requested; the current setup writes Astro `output: 'static'` and Pages config (`wrangler.jsonc` in the generated frontend).
- **Shell note (zsh):** when referencing template files like `templates/astro-src/pages/[...slug].astro`, quote paths to avoid glob expansion.

## Common commands

- Bootstrap: `chmod +x setup.sh && ./setup.sh`
- Drupal dev: `cd drupal-backend && ddev start && ddev launch`
- Astro dev: `cd astro-frontend && npm run dev`
- Build: `cd astro-frontend && npm run build` (requires Drupal JSON:API reachable)
- Deploy (Pages): `./scripts/deploy-frontend.sh`
- Audits: `cd audit && npm install && npm run audit:all`

## Testing & validation

- There is **no dedicated unit/integration test suite** at repo root.
- Validate changes by running the manual flow end-to-end:
  - `./setup.sh` completes and generates `drupal-backend/` + `astro-frontend/`
  - Drupal JSON:API responds at `http://<project>.ddev.site/jsonapi`
  - `cd astro-frontend && npm run build` produces routes in `dist/`
- Use the **audit toolkit** (`audit/`) for structured, non-mutating checks; keep it aligned with current setup behavior.

### Audit targets

Available targets: `setup`, `api`, `static`, `pages`, `build`, `ci`, `docs`

Run individual: `cd audit && npm run audit:setup`
Run all: `cd audit && npm run audit:all`

## Pointers (source of truth)

- Overview: `README.md`
- AI-maintained maps/checklists: `docs/ai/**` (start with `docs/ai/CODEBASE_MAP.md` and `docs/ai/COMMANDS.md`)
- Planning artifacts: `.planning/` (roadmap, phase plans, state)
- Legacy docs exist in `docs/` — files like `ssr-guide.md`, `cloudflare-setup.md`, `github-actions.md` are **not V1 architecture**; they carry Phase 2 banners and should not inform current work
