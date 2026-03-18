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
- **Prefer direct Drupal JSON:API entity queries over Drupal Views for Astro page composition.** Use Views-backed JSON endpoints only when the feed logic should live in Drupal, such as editorially managed curated feeds or unusually complex shared queries.
- **Shell note (zsh):** when referencing template files like `templates/astro-src/pages/[...slug].astro`, quote paths to avoid glob expansion.

## Common commands

- Bootstrap: `chmod +x setup.sh && ./setup.sh`
- Drupal dev: `cd drupal-backend && ddev start && ddev launch`
- Astro dev: `cd astro-frontend && npm run dev`
- Build: `cd astro-frontend && npm run build` (requires Drupal JSON:API reachable)
- Deploy (Pages): `./scripts/deploy-frontend.sh`
- Audits: `cd audit && npm install && npm run audit:all`

## Adding custom Drupal recipes

DAK treats recipes as **Composer packages** of type `drupal-recipe`, following Drupal's native recipe model. Dependencies belong in the recipe's `composer.json`, not in DAK-specific metadata.

### Recipe package structure

Each recipe is a folder containing at minimum:

```
my_recipe/
  composer.json   # type: "drupal-recipe", lists Composer dependencies
  recipe.yml      # Drupal recipe definition (install, config, recipes composition)
  config/         # optional Drupal config YAML files
  content/        # optional default content
```

### Recipe `composer.json` example

```json
{
    "name": "acme/my-custom-recipe",
    "description": "Adds a custom content model.",
    "type": "drupal-recipe",
    "license": ["GPL-2.0-or-later"],
    "require": {
        "drupal/core": "^11",
        "drupal/some_contrib_module": "^1",
        "dak/dak-decoupled-base": "*"
    }
}
```

Composer resolves all transitive dependencies. No separate module pre-enable or package list is needed.

### Recipe ordering

Use the `recipes:` key in `recipe.yml` for composition ordering, not weights:

```yaml
name: My Custom Recipe
type: Site
recipes:
  - dak_decoupled_base
install:
  - some_module
```

### Adding a recipe to a DAK project

**For published recipes:** Add the package to your project's generated `composer.json` and run `composer require`.

**For local/development recipes:** Place the recipe folder under `setup/drupal-recipes/` and add an entry to `setup/recipe-manifest.json`. The setup script registers each recipe as a Composer path repository, then `composer require` resolves it locally.

### Recipe manifest (`setup/recipe-manifest.json`)

The manifest tells the setup wizard which recipes to offer. It contains only UI metadata — no dependency or ordering information:

```json
{
  "core": [
    { "package": "dak/dak-decoupled-base", "name": "dak_decoupled_base", "label": "Decoupled base", "required": true }
  ],
  "optional": [
    { "package": "dak/dak-structured-content", "name": "dak_structured_content", "label": "Structured content", "prompt": "enableStructuredContent" }
  ]
}
```

### What belongs where

| Concern | Where it lives |
|---|---|
| Composer dependencies | Recipe `composer.json` |
| Module installs, config | Recipe `recipe.yml` |
| Recipe ordering | `recipes:` key in `recipe.yml` |
| UI labels, optional prompts | `setup/recipe-manifest.json` |

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
- Planning artifacts: `.agent/execplans/` for ExecPlans and `.agent/PLANS.md` for the ExecPlan contract. Plans do not live in `.planning/`.
- Legacy docs exist in `docs/` — files like `ssr-guide.md`, `cloudflare-setup.md`, `github-actions.md` are **not V1 architecture**; they carry Phase 2 banners and should not inform current work
