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
- `specs/001-project-audit-optimization/tasks.md` (6, historical/local ignored path)
- `.env.example` (6)
- `.github/workflows/main.yml` (2)

## Highest-Churn Areas (top-level path frequency)

- `scripts/` (42 file-touches)
- `audit/` (35, historical/local ignored path)
- `setup/` (33)
- `.github/` (31)
- `specs/` (27, historical/local ignored path)
- `docs/` (19)

## Likely “Break Often” Zones (based on structure + drift signals)

- **Setup orchestration**: `setup/ui.js` (touches DDEV, Composer, Drush, npm, template copying, env stamping).
- **Environment variable contract**: `.env.example` + setup stamping in `setup/ui.js` + template reads in `templates/astro-src/lib/drupal.ts`.
  - Canonical vars: `API_BASE_URL`, `DRUPAL_BASE_URL`, `HOMEPAGE_ALIAS`, `DRUPAL_JSONAPI_URL`. `DRUPAL_API_URL` is deprecated but still stamped for backwards compatibility.
- **CI vs local build**: CI pipeline (`main.yml`) needs `API_BASE_URL` secret pointing to a reachable Drupal instance, while local builds hit DDEV.
- **Audit toolkit coverage**: historical/local ignored `audit/` worktrees may include targets such as `setup`, `static`, `pages`, `build`, `api`, `ci`, and `docs`. These are not fresh-clone repo-provided gates today.

## Recent Commit Themes (last ~20 commits)

- Static-first refactor + template relocation: `git log` shows major changes around 2025-11-24 to 2025-12-01 (e.g., “static-first SSG refactor”, “move source templates to templates/ dir”).

## Assumptions

- Hotspot counts come from the current local git history and include files that may have been deleted since (e.g., historical `astro-frontend/**` paths); confirm current existence with `ls` and historical existence with `git show <rev>:<path>`.
- Churn does not necessarily equal risk; confirm risk areas by running `./setup.sh` end-to-end and by exercising `scripts/deploy-frontend.sh` on a fresh clone.
