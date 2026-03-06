# COMMANDS

## Bootstrap / Setup

- One-time project initialization:
  - `chmod +x setup.sh && ./setup.sh` (`setup.sh` runs `setup/cli.js` which renders `setup/ui.js`)

## Local Development (after setup created projects)

- Start Drupal (DDEV):
  - `cd drupal-backend && ddev start`
  - `cd drupal-backend && ddev launch`
- Start Astro dev server:
  - `cd astro-frontend && npm run dev`

## Build (static SSG)

- Build static output (requires Drupal JSON:API reachable during build):
  - `cd astro-frontend && npm run build`

## Deploy (Cloudflare Pages)

- Build + deploy in one step:
  - `./scripts/deploy-frontend.sh` (uses `npx wrangler pages deploy ./dist`)
- First-time Pages project creation (if needed):
  - `cd astro-frontend && npx wrangler pages project create <project-name>`

## Seed Content (Drupal)

- Create sample pages in Drupal:
  - `./scripts/seed-content.sh` (assumes `drupal-backend/` exists and DDEV is running)

## Audit / Validation Toolkit

- Install audit deps:
  - `cd audit && npm install`
- Run all audit targets:
  - `npm run audit:all`
- Run a specific target:
  - `npm run audit:setup`, `audit:static`, `audit:pages`, `audit:build`, `audit:api`, `audit:ci`, `audit:docs` (see `audit/package.json`)

## Assumptions

- Cloudflare deployment requires `.env` to contain `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `PROJECT_NAME`; confirm by inspecting `.env.example` and `scripts/deploy-frontend.sh`.
- Setup writes `astro-frontend/wrangler.jsonc` (Pages config, JSONC format); confirm by running setup and inspecting the generated file.

