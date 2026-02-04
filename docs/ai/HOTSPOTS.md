# HOTSPOTS

## Highest-Churn Files (from `git log --name-only` frequency)

- `README.md` (27)
- `setup/ui.js` (20)
- `setup.sh` (5)
- `setup/cli.js` (4)
- `scripts/deploy-frontend.sh` (4)
- `scripts/seed-content.sh` (2)
- `docs/architecture.md` (4)
- `docs/deployment.md` (4)
- `docs/troubleshooting.md` (5)
- `specs/001-project-audit-optimization/tasks.md` (6)
- `.env.example` (6)
- `.github/workflows/main.yml` (2)

## Highest-Churn Areas (top-level path frequency)

- `scripts/` (42 file-touches)
- `audit/` (35)
- `setup/` (33)
- `.github/` (31)
- `specs/` (27)
- `docs/` (19)

## Likely “Break Often” Zones (based on structure + drift signals)

- **Setup orchestration**: `setup/ui.js` (touches DDEV, Composer, Drush, npm, template copying, env stamping).
- **Environment variable contract**: `.env.example` + setup stamping in `setup/ui.js` + template reads in `templates/astro-src/lib/drupal.ts`.
  - Example drift: templates use `import.meta.env.API_BASE_URL`, while setup/docs emphasize `DRUPAL_API_URL`.
- **CI expectations vs generated artifacts**: `.github/workflows/main.yml` currently validates `wrangler.toml`, while setup writes `astro-frontend/wrangler.jsonc`.
- **Audit toolkit assumptions**: `audit/scripts/setup_audit.js` checks for `wrangler.toml` and SSR-style Astro config; may not match static-first output.

## Recent Commit Themes (last ~20 commits)

- Static-first refactor + template relocation: `git log` shows major changes around 2025-11-24 to 2025-12-01 (e.g., “static-first SSG refactor”, “move source templates to templates/ dir”).

## Assumptions

- Hotspot counts come from the current local git history and include files that may have been deleted since (e.g., historical `astro-frontend/**` paths); confirm current existence with `ls` and historical existence with `git show <rev>:<path>`.
- Churn does not necessarily equal risk; confirm risk areas by running `./setup.sh` end-to-end and by exercising `scripts/deploy-frontend.sh` on a fresh clone.

