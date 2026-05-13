# Project: Drupal + Astro Starter Kit

## What this repository is

`Drupal_Astro_Kit` is a **generator repo** — a tool that bootstraps two gitignored projects:

- `drupal-backend/` — Drupal 11 running in DDEV (local Docker environment), created by `./setup.sh`
- `astro-frontend/` — Astro static site that fetches content at build time, created by `./setup.sh`

The generator source lives in the tracked directories: `setup/`, `templates/`, `scripts/`, `docs/`, and root-level config files. The generated directories are gitignored and do **not** exist in a fresh clone.

## Architecture (static-first)

```
Drupal 11 (local, DDEV)
    ↓ JSON:API + Linkset (build-time only)
Astro SSG (output: 'static')
    ↓
Static HTML in astro-frontend/dist/
    ↓
Cloudflare Pages (CDN, no runtime)
```

**Critical constraints:**
- Astro runs in `output: 'static'` mode — there is no server-side rendering
- There is no Cloudflare Workers runtime — Cloudflare Pages serves pre-built static HTML only
- Drupal runs locally during development and build; it is not hosted in production
- `drupal-backend/` and `astro-frontend/` are gitignored — they do not exist in a fresh clone

## Key directories in this repo

| Path | Purpose |
|------|---------|
| `setup/` | Interactive Ink-based CLI installer (`setup.sh` → `setup/cli.js` → `setup/ui.js`) |
| `templates/astro-src/` | Astro source files copied into `astro-frontend/src/` during setup |
| `scripts/` | Utility scripts: `deploy-frontend.sh`, `seed-content.sh` |
| `docs/` | User-facing documentation |
| `setup/drupal-recipes/` | Drupal recipes (GPL-2.0-or-later) installed into the generated Drupal backend |

## General Instructions

- When generating new code, follow existing conventions for shell scripts, Astro components, and config files.
- Changes to the setup flow belong in `setup/ui.js` and `setup/cli.js`, **not** in the generated directories.
- Changes to the Astro frontend template belong in `templates/astro-src/`, **not** in `astro-frontend/`.

## Coding Style & Conventions

**Shell Scripts (`scripts/*.sh`):**
- Use `#!/usr/bin/env bash`
- Use color variables (`RED`, `GREEN`, `YELLOW`, `NC`) for user output

**Astro (`templates/astro-src/`):**
- Follow Astro best practices for static site generation
- Use `getStaticPaths()` for all page routes
- The project is `output: 'static'` — no SSR, no server endpoints
- Use environment variables for Drupal API URL (`DRUPAL_API_URL`)

**Drupal recipes (`setup/drupal-recipes/`):**
- Each recipe is a Composer package of type `drupal-recipe`
- Dependencies belong in the recipe's own `composer.json`, not in DAK metadata

## Deployment

The production deployment is static HTML deployed to Cloudflare Pages:

```bash
cd astro-frontend && npm run build    # requires local Drupal running via DDEV
./scripts/deploy-frontend.sh          # deploys dist/ to Cloudflare Pages via wrangler
```

Configuration lives in `astro-frontend/wrangler.jsonc` (generated during setup).

There is no `wrangler.toml` at the repo root. There are no Cloudflare Workers. There is no SSR adapter.
