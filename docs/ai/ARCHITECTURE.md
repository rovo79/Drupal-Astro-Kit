# ARCHITECTURE

## Mental Model: “Generator Repo” + “Generated Projects”

- **This git repo** is primarily tooling + templates.
  - It **generates** `drupal-backend/` and `astro-frontend/` at runtime via `./setup.sh` → `setup/cli.js` → `setup/ui.js`.
- Most “application behavior” (routing, content fetch) lives in **Astro templates** under `templates/astro-src/`, which are copied into `astro-frontend/src/` during setup (`setup/ui.js` copies `templates/astro-src/` → `astro-frontend/src/`).

## Default Architecture: Static-First (SSG)

- **Build-time flow**
  - Drupal runs locally via DDEV (content authoring + JSON:API).
- Astro fetches Drupal JSON:API during build (`getStaticPaths()` in `templates/astro-src/pages/[...slug].astro`).
  - Output: static HTML in `astro-frontend/dist/`.
- **Runtime/production flow**
  - Cloudflare Pages serves static files.
  - No Drupal dependency at runtime (Drupal can remain local-only).
- **Route mapping**
  - Drupal path aliases become Astro routes:
    - `/` → `src/pages/index.astro` → `dist/index.html`
    - `/about` → `src/pages/[...slug].astro` (`slug="about"`) → `dist/about/index.html`
  - Implementation: `templates/astro-src/pages/index.astro`, `templates/astro-src/pages/[...slug].astro` + helpers in `templates/astro-src/lib/drupal.ts`.

## Key Components and Responsibilities

- **Setup orchestrator**
  - `.env` creation + stamping project defaults: `setup/ui.js`
  - Drupal provisioning (DDEV config/start, composer create-project, drush install, enable modules, seed content): `setup/ui.js`
  - Astro provisioning (create-astro, install deps, write config files, copy templates): `setup/ui.js`
- **Astro route generation (template source)**
  - Homepage route: `templates/astro-src/pages/index.astro`
  - Dynamic catch-all route + static path generation: `templates/astro-src/pages/[...slug].astro`
  - JSON:API pagination + deserialization: `templates/astro-src/lib/drupal.ts` (uses `jsona` + `drupal-jsonapi-params`)
- **Deployment (static)**
  - Build + deploy script: `scripts/deploy-frontend.sh` (`npm run build` then `npx wrangler pages deploy ./dist`)
- **Validation / auditing**
  - Fresh-clone validation is manual setup/build plus any focused repo scripts.
  - `audit/` is currently ignored local tooling if present, not a tracked V1 validation dependency.

## Phase 2 (Future): Workers SSR

- SSR/Workers is a potential Phase 2 addition, not the current architecture.
- Legacy SSR-era docs (`docs/future/ssr-guide.md`, `docs/future/cloudflare-setup.md`, `docs/future/github-actions.md`) are walled off in `docs/future/` as Phase 2 reference material.
- The setup script writes **Pages** config (`astro-frontend/wrangler.jsonc`) and sets Astro to **static** output (`setup/ui.js` writes `astro-frontend/astro.config.mjs` with `output: 'static'`).

## Assumptions

- Static-first is the intended default because `setup/ui.js` writes `output: 'static'` into the generated `astro-frontend/astro.config.mjs`; confirm by running `./setup.sh` and inspecting `astro-frontend/astro.config.mjs`.
- SSR/Workers is Phase 2 future roadmap; see `docs/future/phase-2-workers-ssr.md` and the legacy docs walled off in `docs/future/`.
