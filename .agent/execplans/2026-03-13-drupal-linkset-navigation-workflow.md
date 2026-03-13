# Integrate Drupal Linkset menus into the static-first Drupal_Astro_Kit workflow

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this ExecPlan in accordance with `/.agent/PLANS.md`.

This plan builds on `/.agent/execplans/2026-02-04-decoupled-drupal-recipes-overhaul.md`, which established recipe-driven Drupal provisioning and the current static-first environment variable contract. Everything needed to implement this Linkset work is repeated here so the plan remains self-contained.

## Purpose / Big Picture

Today the starter kit can build page routes from Drupal content, but its navigation story is still a placeholder: the base Astro layout hardcodes a single `Home` link. After this change, `./setup.sh` will provision Drupal with menu data that Astro can read through Drupal core’s Linkset endpoint at build time and during local development. The generated Astro frontend will render a real header navigation and footer navigation sourced from Drupal menus, and the deployed Cloudflare Pages site will still remain fully static with no production Drupal dependency.

Someone can see the change working by running `./setup.sh`, confirming that Drupal responds at `http://<project>.ddev.site/system/menu/main/linkset`, starting Astro with `cd astro-frontend && npm run dev`, and seeing `Home`, `About`, and `Contact` rendered from Drupal rather than from hardcoded markup. They can then edit a menu label in Drupal, refresh the Astro page in development, and see the change. Finally, `npm run build` must emit static HTML whose navigation already contains those menu links so the deployed Pages site works after Drupal is offline.

## Progress

- [x] (2026-03-13 13:42Z) Baseline Linkset and menu-related repository context captured from `setup/ui.js`, `setup/drupal-recipes/**`, `templates/astro-src/lib/drupal.ts`, `templates/astro-src/layouts/Base.astro`, and the V1 docs.
- [x] (2026-03-13 13:51Z) Drupal recipe and setup changes implemented so Linkset is enabled, menu starter content exists, and setup validates the required endpoint.
- [x] (2026-03-13 13:52Z) Astro template changes implemented so generated sites fetch, normalize, and render Drupal-owned navigation at build time and in `npm run dev`.
- [x] (2026-03-13 13:53Z) Docs and audits updated to describe and verify the new navigation workflow without implying any production Drupal runtime dependency.
- [ ] (2026-03-13 13:54Z) End-to-end validation partially completed (completed: recipe apply + Linkset curl + Astro build + live dev refresh after menu edit; remaining: one full clean interactive `./setup.sh` run in a fresh directory).

## Surprises & Discoveries

- Observation: The current Astro template does not have a real menu system. `templates/astro-src/layouts/Base.astro` renders a single hardcoded `<a href="/">Home</a>` inside the header, so the starter kit has content routing but not a Drupal-owned navigation model.
  Evidence: `templates/astro-src/layouts/Base.astro` lines 77-81.

- Observation: The current starter recipe seeds only page nodes. It does not seed any `menu_link_content` entities, so even after Drupal is installed there is no canonical starter menu tree for Astro to consume.
  Evidence: `setup/drupal-recipes/dak_starter_content/recipe.yml` declares only the `starter` content pack, and `setup/drupal-recipes/dak_starter_content/content/starter/` currently contains only `node/page/*.yml`.

- Observation: The homepage content contract currently lives at alias `/home`, but the public Astro homepage is rendered at `/`. If Linkset is introduced without aligning Drupal’s front page behavior, a starter “Home” menu item can easily point to `/home` instead of `/`, creating a split-brain navigation story.
  Evidence: the starter homepage content export uses alias `/home`, while `templates/astro-src/pages/index.astro` maps `/` to either alias `/` or `HOMEPAGE_ALIAS`, which defaults to `/home`.

- Observation: Drupal’s Linkset endpoint is not part of JSON:API. It is a separate core endpoint under `/system/menu/<menu-name>/linkset`, and enabling it requires feature-flag style setup rather than simply enabling the `jsonapi` module. Cache rebuilds matter because newly enabled routes may not appear immediately after recipe application.
  Evidence: implementation guidance captured from Drupal core documentation and issue discussion during plan research; route validation must therefore be part of setup and acceptance.

- Observation: Menu-fetch caching must not behave the same way in `astro dev` and `astro build`. Caching Linkset responses during `astro build` is useful to avoid repeated identical requests from the shared layout, but caching in dev would make Drupal menu edits appear stale until the dev server restarts.
  Evidence: the current page fetch layer intentionally re-fetches content during development, and README promises refreshed Drupal content on navigation while `npm run dev` is running.

- Observation: Drupal standard install already ships a `Home` link in the `main` menu. Importing another starter `Home` menu link can create duplicate `Home` items in Linkset output when reusing an existing site state.
  Evidence: live Linkset payload from `curl http://dakblue.ddev.site/system/menu/main/linkset` showed two `Home` items when a custom front-page link had already been inserted.

## Decision Log

- Decision: Use Linkset only for navigational menus, not for page route generation or structured content.
  Rationale: This keeps JSON:API as the content contract and uses Linkset only where it is strongest: exposing Drupal-owned navigation trees.
  Date/Author: 2026-03-13 / user + agent

- Decision: Scope the first implementation to the Drupal `main` menu and `footer` menu. Treat `main` as required and `footer` as optional. Defer any utility menu until a later milestone.
  Rationale: This gives the starter kit a realistic navigation system without widening the implementation into every possible menu surface.
  Date/Author: 2026-03-13 / agent

- Decision: Keep Drupal as the source of truth for navigational structure and remove the hardcoded header link from the Astro template.
  Rationale: Mixing hardcoded Astro links with Drupal-owned menu links would make navigation behavior ambiguous and brittle.
  Date/Author: 2026-03-13 / user + agent

- Decision: Align Drupal’s front page setting with the existing `/home` starter content contract by configuring Drupal’s front page to `/home` and seeding the starter “Home” menu item as a front-page link rather than as a raw `/home` link.
  Rationale: This preserves the existing `HOMEPAGE_ALIAS=/home` story while allowing Linkset-driven navigation to send users to `/` in the generated static site.
  Date/Author: 2026-03-13 / agent

- Decision: Cache normalized menu data only in non-dev builds and fetch menus fresh during `astro dev`.
  Rationale: This keeps build performance reasonable without breaking the documented “save in Drupal, refresh Astro, see the change” workflow.
  Date/Author: 2026-03-13 / agent

- Decision: If the `main` Linkset endpoint is unavailable, fail setup and fail Astro rendering with an actionable message that names the missing endpoint and mentions Linkset enablement plus cache rebuilds. If the `footer` menu is absent, log a warning and render no footer menu.
  Rationale: Main navigation is core starter-kit behavior; footer navigation is helpful but should not block page rendering.
  Date/Author: 2026-03-13 / user guidance + agent

- Decision: Keep starter-content recipe menu exports to `About`/`Contact` links for `main` and `footer`, and rely on Drupal's existing front-page `Home` link while keeping `scripts/seed-content.sh` idempotent for all three labels.
  Rationale: This avoids duplicate `Home` links on installs that already include a front-page menu item, while still guaranteeing `Home`/`About`/`Contact` navigation after setup.
  Date/Author: 2026-03-13 / agent

## Outcomes & Retrospective

Implementation is substantially complete in source-of-truth files. Setup recipes now enable Linkset and set Drupal front page to `/home`; starter content includes menu link entities; setup validates required `/system/menu/main/linkset` after cache rebuild; Astro templates now fetch, normalize, and render Linkset menus; docs were updated to describe JSON:API + Linkset build inputs; and validation demonstrated live menu-edit refresh behavior in `astro dev` plus static HTML containing navigation links after `npm run build`.

The main remaining acceptance gap is one fresh interactive `./setup.sh` run in a clean directory to validate the full guided flow end-to-end without relying on pre-existing local state.

## Context and Orientation

This repository is not the final website. It is a generator that creates `drupal-backend/` and `astro-frontend/` when `./setup.sh` runs. The source-of-truth files that matter for this plan live in the checked-in repo:

- `setup/ui.js` orchestrates DDEV, Composer, Drupal install, recipe copy/apply steps, `.env` stamping, and Astro frontend creation.
- `setup/drupal-recipes/dak_decoupled_base/recipe.yml` defines the baseline Drupal configuration applied after install.
- `setup/drupal-recipes/dak_starter_content/recipe.yml` and `setup/drupal-recipes/dak_starter_content/content/starter/**` define starter content committed in the generator.
- `templates/astro-src/lib/drupal.ts` is the server-side data layer copied into the generated Astro app. It currently fetches pages through Drupal JSON:API.
- `templates/astro-src/pages/index.astro` and `templates/astro-src/pages/[...slug].astro` render content pages and prove that Astro currently relies on Drupal only at build time or during dev requests.
- `templates/astro-src/layouts/Base.astro` is the shared layout that currently hardcodes the header link and footer text.
- `README.md`, `docs/architecture.md`, and `docs/ai/CODEBASE_MAP.md` explain the V1 static-first model and must stay consistent with the new menu behavior.
- `audit/` contains the repo’s validation scripts. There is no unit-test suite at the repo root, so manual end-to-end validation and audit checks are the primary proof of correctness.

Define the terms used in this plan plainly:

- A “menu” is Drupal’s stored navigation structure, such as the `main` menu shown in a site header.
- “Linkset” is Drupal core’s endpoint for returning a menu as machine-readable link data. The endpoint pattern is `/system/menu/<menu-name>/linkset`.
- A “recipe” is Drupal’s declarative package format used here to enable modules, update configuration, and import starter content during setup.
- “Static-first” means Astro reads Drupal before or during HTML generation, writes finished HTML into `dist/`, and Cloudflare Pages serves that HTML later without talking to Drupal.

The generated site must continue to use JSON:API for page bodies and aliases. Linkset is additive. It provides menu structure, not content schema, not page routing, and not live publishing.

## Plan of Work

The work should proceed in four milestones that each leave the repository in a more complete and demonstrable state.

### Milestone 1: Enable Linkset and seed Drupal-owned starter menus

Update the Drupal source-of-truth first so the generated backend can expose Linkset reliably. In `setup/drupal-recipes/dak_decoupled_base/recipe.yml`, extend the existing baseline recipe so it not only enables `jsonapi`, `path`, and `pathauto`, but also turns on the Linkset feature flag in Drupal configuration. Implement this in the recipe rather than by ad-hoc imperative mutation so the behavior remains part of the generator’s declarative Drupal story. The same milestone must also align Drupal’s idea of the front page with the current Astro contract by setting the site front page to `/home`.

Extend `setup/drupal-recipes/dak_starter_content/content/starter/` with starter `menu_link_content` exports for the `main` and `footer` menus. Keep the initial information architecture small and obvious: seed `About` and `Contact` for `main`, and `About` plus `Contact` for `footer`, while relying on Drupal’s existing front-page `Home` item. Ensure `scripts/seed-content.sh` preserves an idempotent `Home` front-page link (`route:<front>`) when it is missing so the generated static site’s primary nav still points at `/`. Use stable exported YAML content committed in the recipe content pack so rerunning setup produces the same menu tree every time.

In `setup/ui.js`, keep the existing recipe copy/apply flow, but add the missing reliability work around Linkset: after recipes are applied, run a Drupal cache rebuild and then verify that `http://<project>.ddev.site/system/menu/main/linkset` responds successfully. The failure message must say exactly which endpoint failed and tell the operator that Linkset may be disabled or Drupal caches may still need to be rebuilt. The setup flow should also probe `footer` non-fatally and log a warning rather than abort if it is missing.

Acceptance for this milestone is Drupal-only: after `./setup.sh`, a manual `curl` to the main menu Linkset endpoint returns a structured response containing starter menu links, and Drupal’s main menu UI shows the same items.

### Milestone 2: Add a build-time Linkset client and normalize menu trees for Astro

Once Drupal can serve menu data, add a small Linkset client to `templates/astro-src/lib/drupal.ts`. Do not add a new npm package for this. The repo already has a lightweight server-side fetch layer, and Linkset support here is small enough to normalize directly. Add a clear type such as `DrupalMenuItem` with fields for `title`, `href`, `children`, and optional metadata needed for rendering. The helper should fetch from `${DRUPAL_BASE_URL}/system/menu/${menuName}/linkset`, not from JSON:API, because Linkset is a separate endpoint.

Build the normalizer so Astro receives a simple tree instead of raw Linkset records. The normalizer must preserve nested menu items, preserve external links, and collapse same-origin Drupal URLs back to site-relative paths so the generated static site does not hardcode the local DDEV host into header and footer links. Any items missing a title or URL should be skipped with a warning so malformed menu entries do not crash the entire build.

Implement the required-versus-optional behavior in the fetch helper itself. `getMenu('main', { required: true })` must throw an error that names the missing endpoint and hints at Linkset enablement plus cache rebuild. `getMenu('footer', { required: false })` must log a warning and return an empty array if the endpoint is absent or the menu is empty. Add a build-only cache inside `drupal.ts` so static builds do not re-fetch the same menu for every page render, but explicitly bypass that cache in `astro dev`.

Acceptance for this milestone is code-level and observable: a small manual script or page render can call the new helper and produce a normalized tree containing `Home`, `About`, and `Contact` without leaking the DDEV hostname into the hrefs.

### Milestone 3: Replace the hardcoded Astro header with Drupal-backed navigation

After the data layer exists, update the Astro template source so generated frontends actually render Linkset-backed menus. Create dedicated components under `templates/astro-src/components/` rather than placing all recursion and rendering logic directly into `templates/astro-src/layouts/Base.astro`. A practical split is `Navigation.astro` for a menu wrapper and `NavigationItem.astro` for recursive nested items. The header should render the required `main` menu, and the footer should render the optional `footer` menu when present.

Update `templates/astro-src/layouts/Base.astro` to import the new navigation components, fetch the required menu data in server-side frontmatter, and remove the hardcoded `Home` link. Keep the rest of the layout static-first: no client JavaScript, no Astro islands, and no runtime workers logic. The generated HTML should already include the navigation tree in both `npm run dev` responses and `npm run build` output.

This milestone must also preserve the current development promise. While `cd astro-frontend && npm run dev` is running, an editor who changes a Drupal menu label and refreshes the page should see the new label without restarting Astro. This is why menu caching is disabled in dev mode.

Acceptance for this milestone is user-visible: the generated site’s homepage and interior pages show Drupal-driven header navigation and footer navigation, and deleting or renaming a menu item in Drupal changes what Astro renders.

### Milestone 4: Update docs, audits, and validation paths so the new menu flow is explicit

Document the new architecture as part of the implementation, because Linkset is easy to misunderstand as a runtime feature if the docs stay vague. Update `README.md` so the architecture and “content updates” sections explain that Drupal now owns both content and navigation structure, Astro reads pages from JSON:API and menus from Linkset at build time, and the deployed site remains static. Update `docs/architecture.md` to name Linkset explicitly in the data-flow diagrams and component responsibilities. Update `docs/ai/CODEBASE_MAP.md` so future contributors know that `templates/astro-src/lib/drupal.ts` handles both JSON:API page fetching and Linkset menu fetching.

Extend the audit toolkit with checks that match this new contract. The minimum useful coverage is one setup or API audit that verifies the main Linkset endpoint is reachable when `.env` points at a working local Drupal instance, and one static/build audit that verifies generated HTML contains the starter navigation links. Keep the audit changes small and aligned with existing targets; do not invent a large new audit subsystem just for menus.

Acceptance for this milestone is repository clarity: a newcomer can read the docs, run the audits, and understand that Linkset improves navigation without changing the static-first production model.

## Concrete Steps

Run the following commands from the repo root unless a different working directory is shown.

1. Capture the current baseline and confirm the missing navigation model.

    pwd
    nl -ba templates/astro-src/layouts/Base.astro | sed -n '70,95p'
    find setup/drupal-recipes/dak_starter_content/content -type f | sort

   Expected observation: the layout contains a hardcoded `Home` link, and the starter content pack contains only page entities.

2. Implement Drupal recipe and setup changes, then run the generator end to end.

    chmod +x ./setup.sh
    ./setup.sh

   Use a fresh test directory so generated output is clean. Choose the default “Basics” Astro template unless the work reveals a template-specific issue. Expected observation: the setup summary completes successfully, then `drupal-backend/` and `astro-frontend/` exist.

3. Verify Linkset is enabled and the starter menus exist.

    curl -s http://<project>.ddev.site/system/menu/main/linkset | head -n 20
    curl -s http://<project>.ddev.site/system/menu/footer/linkset | head -n 20

   Expected observation: the first response is successful and contains menu link information for `Home`, `About`, and `Contact`. The second response may be empty only if the footer menu was intentionally treated as optional; in the target implementation it should contain footer links.

   If the main endpoint returns 404 immediately after setup, retry safely with:

    cd drupal-backend
    ddev exec drush cr
    curl -s http://<project>.ddev.site/system/menu/main/linkset | head -n 20

   If the second command fixes the endpoint, update the plan’s `Surprises & Discoveries` and strengthen the setup cache-rebuild step before calling the work complete.

4. Verify Astro renders Drupal-owned navigation in development.

    cd astro-frontend
    npm run dev

   In a second terminal:

    curl -s http://localhost:4321/ | rg "Home|About|Contact"
    curl -s http://localhost:4321/about/ | rg "Home|About|Contact"

   Expected observation: both pages include the navigation labels in the rendered HTML.

5. Verify menu edits flow through Astro during development without restarting the dev server.

    open http://<project>.ddev.site/admin/structure/menu/manage/main

   Change one label, for example rename `Contact` to `Reach Us`, save the Drupal menu, then refresh the Astro page in the browser or run:

    curl -s http://localhost:4321/ | rg "Reach Us"

   Expected observation: the changed label appears while the same `npm run dev` session is still running.

6. Verify the static build captures menu output for deployment.

    cd astro-frontend
    npm run build
    rg -n "Home|About|Contact|Reach Us" dist

   Expected observation: `dist/index.html` and at least one interior page contain the rendered navigation labels. This proves the Cloudflare Pages deployment will not need Drupal at runtime.

## Validation and Acceptance

This work is accepted only when all of the following are true:

- A fresh `./setup.sh` run creates a Drupal site where `curl http://<project>.ddev.site/system/menu/main/linkset` succeeds without manual repair beyond the documented setup flow.
- The generated Astro frontend renders navigation from Drupal-owned menus rather than from hardcoded layout markup.
- Editing a Drupal menu during `npm run dev` changes the rendered navigation on refresh without restarting the dev server.
- `cd astro-frontend && npm run build` succeeds and the generated `dist/` HTML contains the same menu labels and links.
- The docs still state clearly that production is static-only and does not require a live Drupal API after deployment.
- Any added audit command passes and detects the Linkset contract when the local environment is configured correctly.

The most important human verification is this: stop the Astro dev server after a successful build, inspect `dist/index.html`, and confirm the navigation is already there. That proves Linkset is part of the build artifact, not a runtime dependency.

## Idempotence and Recovery

The plan must remain safe to rerun. Recipe content must use stable exports so rerunning setup in a fresh directory creates the same menu tree. The setup validation step should fail fast before Astro setup if the required main Linkset endpoint is missing, because there is no value in generating a frontend that will immediately fail to render navigation.

If recipe application succeeds but the Linkset route still returns 404, the first safe recovery step is `cd drupal-backend && ddev exec drush cr`. If that resolves the route, preserve the stronger cache rebuild in `setup/ui.js` and document the behavior. If it does not, inspect the generated Drupal configuration and recipe content before touching Astro code.

If menu rendering fails in Astro, recovery should begin in `templates/astro-src/lib/drupal.ts` by logging the exact endpoint URL and the raw response status. Do not work around Linkset failures by hardcoding menu links back into `Base.astro`; that would undo the main purpose of this change.

## Artifacts and Notes

Keep the most useful snippets concise. The following examples show the shape of evidence to preserve in commits or follow-up plan updates.

Example main-menu endpoint proof:

    $ curl -s http://daaak.ddev.site/system/menu/main/linkset | head -n 8
    {
      "linkset": [
        { "title": "Home", "href": "/" },
        { "title": "About", "href": "/about" },
        { "title": "Contact", "href": "/contact" }
      ]
    }

Example static-build proof:

    $ cd astro-frontend && npm run build
    ✓ Fetched 3 pages from Drupal JSON:API
    ✓ Fetched main menu from Drupal Linkset
      Routes generated: 3
      dist/index.html contains Home / About / Contact navigation

If the actual Linkset payload shape differs from the example above, update this section with the real output while keeping the higher-level normalization contract unchanged.

## Interfaces and Dependencies

In `templates/astro-src/lib/drupal.ts`, define and export a menu interface that is simple enough for Astro templates to consume directly:

    export interface DrupalMenuItem {
      title: string;
      href: string;
      children: DrupalMenuItem[];
      description?: string;
    }

The same module should expose a function with required-versus-optional behavior:

    export async function getMenu(
      menuName: string,
      options?: { required?: boolean }
    ): Promise<DrupalMenuItem[]>

Internally, the module should also own:

- a Linkset URL builder based on `DRUPAL_BASE_URL`
- a normalizer that turns raw Linkset records into a nested `DrupalMenuItem[]`
- a build-only cache that is disabled when `import.meta.env.DEV` is true

In `templates/astro-src/components/Navigation.astro`, define a presentational component that accepts:

    interface Props {
      items: DrupalMenuItem[];
      label: string;
      variant?: 'header' | 'footer';
    }

If recursive rendering is needed for nested menus, add `templates/astro-src/components/NavigationItem.astro` rather than inlining complex tree-walking logic into `Base.astro`.

In `setup/ui.js`, keep the public workflow centered on `runSetup()` and extend the Drupal steps with:

- recipe updates that enable Linkset and front-page alignment
- a cache rebuild after recipe application
- a Linkset validation helper that probes `main` and `footer`

No new runtime service, SSR adapter, Workers code, or external menu npm dependency should be introduced as part of this plan.

## Revision Notes

- (2026-03-13 / agent) Created the initial ExecPlan because the repo’s static-first workflow already has a strong content story but still lacks a Drupal-native navigation story. The plan keeps JSON:API for content, introduces Linkset only for menus, and explicitly preserves the “build static HTML, deploy only Astro output” operating model.
- (2026-03-13 / agent) Updated the plan after implementation to mark completed milestones, record the standard-profile duplicate `Home` discovery, document the decision to avoid importing a second `Home` menu link, and capture remaining validation work (fresh clean `./setup.sh` run).
