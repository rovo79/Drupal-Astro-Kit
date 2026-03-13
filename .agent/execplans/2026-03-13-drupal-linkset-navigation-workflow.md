# Strengthen the Drupal-to-Astro publishing bridge with Linkset navigation, editorial workflow, rebuild triggers, and explicit content contracts

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this ExecPlan in accordance with `/.agent/PLANS.md`.

This plan builds on `/.agent/execplans/2026-02-04-decoupled-drupal-recipes-overhaul.md`, which established recipe-driven Drupal provisioning and the current static-first environment-variable contract. Everything needed to implement the remaining bridge work is repeated here so the plan remains self-contained.

## Purpose / Big Picture

The starter kit now has Drupal-owned navigation through Linkset, but the handoff between “what editors changed in Drupal” and “what Astro actually built and deployed” is still too implicit. After this change, the kit will make four parts of that handoff explicit. Drupal will own navigation through Linkset. Drupal editorial state will be disciplined with Workflows and Content Moderation so editors can distinguish drafts, review-ready content, and published content. Publishing a page or changing a menu will be able to trigger a rebuild webhook automatically when the project owner configures one. Astro will stop assuming “all `node--page` entities become pages” and will instead follow a typed, developer-facing contract that declares which Drupal resource types and menus the frontend consumes.

Someone can see the finished behavior by running `./setup.sh`, confirming that Drupal exposes `http://<project>.ddev.site/system/menu/main/linkset`, opening a Basic page or Article in Drupal and seeing moderation states such as Draft and Published, changing a moderation state to Published and observing a rebuild webhook fire, then running `cd astro-frontend && npm run build` and seeing only the configured Drupal resource types become static routes. The deployed site must remain static-first throughout: no server-rendered preview mode, no Workers runtime, and no production dependency on a live Drupal instance.

## Progress

- [x] (2026-03-13 13:42Z) Baseline repository context captured across `setup/ui.js`, `setup/drupal-recipes/**`, `templates/astro-src/**`, and the V1 static-first docs.
- [x] (2026-03-13 13:53Z) Linkset navigation work implemented in source-of-truth files: Drupal recipes enable Linkset, starter menus are seeded, Astro fetches and renders Linkset menus, and docs/audits describe the static build-time menu flow.
- [x] (2026-03-13 15:18Z) Existing repo baseline for the next bridge improvements re-audited: manual rebuild publishing is documented, moderation modules are not yet provisioned, no publish webhook bridge exists, and Astro still hardcodes `node--page` as the only routable JSON:API resource type.
- [x] (2026-03-13 16:45Z) Milestone 1 validation executed in disposable DDEV copies outside the main workspace, which confirmed that the clean-run gap is real and surfaced environment-specific validation hazards before moderation work begins.
- [ ] (2026-03-13 16:45Z) Fresh clean `./setup.sh` validation of the already-landed Linkset milestone remains outstanding (completed: one `/tmp` clean run to the post-recipe Linkset probe, one `/private/tmp` rerun through reset/scaffold/install setup, and a source-of-truth `setup/ui.js` patch to normalize container-side readability with `sudo`; remaining: one uninterrupted clean run in a real-path disposable directory, then explicit verification of `/jsonapi`, `/system/menu/main/linkset`, and `astro-frontend` build output).
- [ ] Implement Drupal editorial workflow support with `workflows` and `content_moderation`, including deterministic starter configuration for Basic pages and Articles.
- [ ] Implement an optional publish-triggered rebuild bridge so Drupal can notify a configured build endpoint when published content or navigational menus change.
- [ ] Introduce a typed Astro config contract for content-type-to-component mapping and Linkset menu selection, then refactor page generation to honor it.
- [ ] Update docs, setup prompts/env handling, and audits so the editorial and build-trigger workflow is understandable to a novice and demonstrably works.

## Surprises & Discoveries

- Observation: The Linkset milestone is already materially implemented in source-of-truth files, so this plan is now an expansion plan rather than a greenfield navigation plan.
  Evidence: `setup/drupal-recipes/dak_decoupled_base/recipe.yml` enables `system.feature_flags.linkset_endpoint`, `templates/astro-src/lib/drupal.ts` contains `getMenu()`, and `README.md` plus `docs/architecture.md` already describe Linkset-backed menus.

- Observation: The repo already documents rebuild-to-publish as an intentional manual workflow, but there is no Drupal-side mechanism that can notify a deployment pipeline when editors publish content.
  Evidence: `docs/publishing.md` says “Edit in Drupal → Save/Publish → Rebuild Astro → Deploy to Pages → Live”, while neither `setup/ui.js` nor `setup/drupal-recipes/**` nor `templates/astro-src/**` contains webhook or publish-trigger logic.

- Observation: The generated Astro client still hardcodes `node--page` as the only routable content collection, which means the frontend contract is implicit and cannot cleanly scale to Article or other Drupal resource types.
  Evidence: `templates/astro-src/lib/drupal.ts` builds its collection URL from `/jsonapi/node/page` and `buildPageQueryParams()` only adds fields for `node--page`.

- Observation: The current GitHub Actions workflow deploys on Git pushes and accepts `API_BASE_URL` as a secret, but it does not expose any inbound publish trigger from Drupal.
  Evidence: `.github/workflows/main.yml` listens to `push` and `pull_request` only, then runs `cd astro-frontend && npm run build` with `API_BASE_URL` in the environment.

- Observation: Any rebuild trigger design has to respect the repository’s local-first architecture. Drupal runs inside DDEV locally by default, so a publish bridge cannot assume a permanently hosted Drupal instance or a queue service.
  Evidence: `README.md`, `docs/architecture.md`, and `docs/publishing.md` all describe local Drupal plus static Pages deploys as the default V1 model.

- Observation: The developer-facing content contract should stay narrow. Asking developers to map resource type to renderer and menu names is useful; asking them to describe fields, aliases, or JSON:API internals in configuration would add complexity without strengthening the bridge.
  Evidence: the current frontend already derives routes from Drupal aliases and reads field payloads directly, so the missing abstraction is ownership of routable resource types, not field-level schema configuration.

- Observation: Clean-run validation from macOS `/tmp` is misleading for DDEV in this repository because DDEV canonicalizes the project root to `/private/tmp/...`, while the setup flow and manual probes were launched from `/tmp/...`.
  Evidence: during Milestone 1 validation, `ddev restart` refused to proceed because the project root was already registered as `/private/tmp/dak-m1-20260313-155337/drupal-backend` and would not change to `/tmp/dak-m1-20260313-155337/drupal-backend`.

- Observation: In the `/tmp` validation run, the required Linkset probe failed, but so did `/jsonapi` and even `/README.md`, which means that particular failure was not specific to Linkset.
  Evidence: inside the generated DDEV web container, `curl -i -s http://localhost/jsonapi`, `curl -i -s http://localhost/system/menu/main/linkset`, and `curl -i -s http://localhost/README.md` all returned the same nginx `404 Not Found` response.

- Observation: The source-of-truth setup flow now includes an unverified mitigation to normalize docroot readability inside the DDEV container with `sudo chmod -R a+rX web vendor` after scaffold and Composer changes, but Milestone 1 still needs one uninterrupted rerun to prove whether that mitigation is sufficient.
  Evidence: `setup/ui.js` was patched during Milestone 1 execution after the first clean run exposed container-side read/serve inconsistencies and `ddev exec bash -lc 'sudo -n true'` confirmed passwordless sudo is available in the DDEV web container.

## Decision Log

- Decision: Keep the static-first production model intact. Do not add preview mode, SSR, Cloudflare Workers runtime logic, or a live production Drupal dependency as part of this bridge work.
  Rationale: The user explicitly wants the bridge to become clearer, not the platform to change shape. The weakest point is the handoff between authored and built state, not runtime rendering.
  Date/Author: 2026-03-13 / user + agent

- Decision: Treat Linkset as a completed first milestone and fold the remaining bridge improvements into the same ExecPlan instead of creating a second fragmented plan.
  Rationale: Navigation ownership, editorial workflow, publish-triggered rebuilds, and explicit frontend contracts are one coherent handoff story. Splitting them would make future work harder to follow.
  Date/Author: 2026-03-13 / agent

- Decision: Enable `workflows` and `content_moderation` for the Drupal content types Astro is expected to consume first, starting with Basic pages and Articles.
  Rationale: Moderation matters before Astro fetches anything. Editors need a clear working state versus published state, and Drupal Standard already gives the repo a natural Basic page/Article baseline.
  Date/Author: 2026-03-13 / user + agent

- Decision: Keep Astro consuming only published content at build time even after moderation is introduced.
  Rationale: Moderation is for editorial discipline, not preview delivery. The static build should remain simple and deterministic by consuming the published state only.
  Date/Author: 2026-03-13 / agent

- Decision: Implement publish-to-rebuild as an optional outbound webhook from Drupal rather than an inbound service or a custom synchronization platform.
  Rationale: A single outbound POST is the smallest useful bridge between “published in Drupal” and “rebuilt in Astro”. It matches the static-first model and avoids introducing a new always-on service.
  Date/Author: 2026-03-13 / user + agent

- Decision: The webhook bridge must be best-effort and must not block Drupal editorial saves if the remote endpoint is unavailable.
  Rationale: Editors should not lose work because a build provider is down. Failed notifications should be logged clearly, and the manual rebuild path described in `docs/publishing.md` must remain valid.
  Date/Author: 2026-03-13 / agent

- Decision: Introduce a typed frontend config file that maps Drupal JSON:API resource types to Astro renderer component keys and declares the menus Astro should fetch. Do not require developers to configure fields or routes there.
  Rationale: This is the smallest contract that clarifies ownership without leaking JSON:API implementation detail into day-to-day developer setup.
  Date/Author: 2026-03-13 / user + agent

- Decision: Keep the existing environment contract centered on `DRUPAL_BASE_URL` and `DRUPAL_JSONAPI_URL`, even if the frontend config object exposes an `apiBaseUrl` property.
  Rationale: The repo’s golden rules explicitly require env-var consistency across `.env.example`, `setup/ui.js`, and Astro templates. Introducing a second base-url variable name would create avoidable drift.
  Date/Author: 2026-03-13 / agent

- Decision: Treat clean-run validation directories under real paths such as `/private/tmp/...` as authoritative for Milestone 1, and treat `/tmp/...` results as suspect unless the DDEV root path is identical in both the host and container tooling.
  Rationale: The first Milestone 1 clean run demonstrated that the `/tmp` to `/private/tmp` realpath mismatch can create DDEV project-root drift that obscures whether a setup failure belongs to the repo or the validation harness.
  Date/Author: 2026-03-13 / agent

## Outcomes & Retrospective

The repository has already crossed the first bridge milestone conceptually: navigation is Drupal-owned through Linkset instead of hardcoded in Astro. However, Milestone 1 execution showed that the clean-run acceptance proof still needs dedicated attention before the next workflow milestones start, because the disposable validation environment exposed DDEV realpath drift and docroot-serving inconsistencies that were not covered by the earlier targeted checks.

The expanded plan still keeps the already-landed Linkset behavior, adds a disciplined editorial state model, introduces a minimal publish hook, and narrows the frontend contract to resource-type and menu ownership. The immediate risk is not overengineering; it is moving on before the clean bootstrap is proven in a real-path disposable directory. That validation remains the gate for the rest of the bridge work.

## Context and Orientation

This repository is a generator, not the final app. Running `./setup.sh` creates two gitignored projects:

- `drupal-backend/`, a Drupal 11 site managed locally through DDEV.
- `astro-frontend/`, an Astro static site that fetches Drupal data during `npm run dev` and `npm run build`.

The source-of-truth files for this work live in the checked-in generator repo:

- `setup/ui.js` orchestrates setup, prompts, recipe copying, environment stamping, Drupal installation, and Astro project creation.
- `setup/drupal-recipes/dak_decoupled_base/recipe.yml` enables Drupal modules and baseline config such as Linkset.
- `setup/drupal-recipes/dak_starter_content/recipe.yml` and `setup/drupal-recipes/dak_starter_content/content/starter/**` define the starter pages and menu links that get imported into fresh Drupal installs.
- `templates/astro-src/lib/drupal.ts` is the build-time and dev-time Drupal client copied into generated Astro projects.
- `templates/astro-src/layouts/Base.astro` plus `templates/astro-src/components/Navigation*.astro` render Linkset-backed navigation.
- `templates/astro-src/pages/index.astro` and `templates/astro-src/pages/[...slug].astro` generate the static routes.
- `scripts/deploy-frontend.sh` documents the current manual rebuild-and-deploy flow.
- `.github/workflows/main.yml` is the optional CI deploy path; it currently builds on git pushes, not on Drupal publish events.
- `README.md`, `docs/architecture.md`, and `docs/publishing.md` explain the current static-first operating model and must remain consistent with any new workflow.
- `audit/scripts/jsonapi_audit.js` and `audit/scripts/build_contract_audit.js` are the most relevant existing validation scripts for API and build contracts.

Define the terms used in this plan plainly:

- A “menu” is Drupal’s stored navigation structure, such as the `main` or `footer` menu.
- “Linkset” is Drupal core’s machine-readable menu endpoint at `/system/menu/<menu-name>/linkset`.
- A “workflow” is Drupal’s editorial state machine, which defines content states such as Draft or Published and the transitions between them.
- “Content Moderation” is the Drupal core module that lets content types use those workflow states while still keeping the currently published version available.
- A “publish-triggered rebuild” is a simple HTTP POST from Drupal to a configured build provider or automation endpoint after a relevant published change occurs.
- A “content contract” is the small typed configuration that tells Astro which Drupal resource types and menus it is allowed to consume.
- “Static-first” means Astro turns Drupal data into finished HTML during development and build time, then Cloudflare Pages serves that finished HTML later without contacting Drupal.

Two current facts matter for the implementation. First, Linkset is already enabled and rendered in Astro. Second, `templates/astro-src/lib/drupal.ts` still assumes that all routable content lives under `node--page`. The point of the remaining work is to make the authored-to-built boundary explicit without changing the deployment model.

## Plan of Work

The work should proceed in five milestones that each leave the repository in a more explicit, verifiable state.

### Milestone 1: Lock in navigation ownership and finish the missing clean-run validation

Start by treating the Linkset navigation work as a completed baseline, not as speculative work. Run one full clean `./setup.sh` flow in a fresh directory and capture any differences between that end-to-end run and the targeted validation already completed. If the clean run exposes recipe-ordering, cache-rebuild, or menu-seeding drift, fix that drift before adding moderation or webhook features. The rest of this plan assumes the menu handoff is already reliable.

Acceptance for this milestone is narrow and concrete: a fresh setup produces a Drupal site whose main Linkset endpoint responds successfully and a generated Astro site whose header and footer navigation are Drupal-owned rather than hardcoded.

### Milestone 2: Add explicit Drupal editorial workflow for buildable content

After the navigation baseline is confirmed, add a new source-of-truth recipe for editorial state, for example `setup/drupal-recipes/dak_editorial_workflow/recipe.yml`, plus any required `config/install/*.yml` exports. This recipe must enable Drupal core’s `workflows` and `content_moderation` modules and apply a deterministic moderation workflow to the content types Astro is expected to render first. Use Basic pages and Articles as the initial scope because Drupal Standard provides both and the frontend contract in a later milestone will declare both as supported resource types.

The workflow should stay intentionally simple. A novice should be able to read the Drupal edit form and understand what is live and what is still in progress. A practical default is Draft, In Review, and Published. Do not add preview URLs, unpublished frontend fetching, or custom moderation-state-specific rendering in Astro. The only frontend rule is that Astro builds from published content.

Keep starter content compatible with the new workflow. The seed pages imported by `dak_starter_content` must remain published after setup so the generated Astro site still builds successfully out of the box. If Article support is added to the frontend contract in the next milestone, seed one sample Article or document clearly that Article routing is supported even when no starter Article exists.

Update `setup/ui.js` so the editorial workflow recipe is copied and applied as part of the normal setup flow. If recipe application order matters, make it explicit: baseline Drupal config first, starter content second, editorial workflow before any webhook module that depends on moderation-state changes.

Acceptance for this milestone is visible in Drupal: after setup, editing a Basic page or Article shows moderation-state controls, saving Draft does not change the published HTML yet, and switching to Published makes the content eligible for the next Astro build.

### Milestone 3: Bridge Drupal publish events to an optional rebuild webhook

Once editorial state is explicit, connect “content became published” to “a build can be triggered”. Implement this with a very small Drupal custom module stored in the generator repo, for example under `setup/drupal-modules/dak_publish_bridge/`, then copied into the generated Drupal site by `setup/ui.js`. The module should subscribe to relevant content and menu changes and perform a best-effort HTTP POST to a configured webhook URL whenever a published change occurs.

The trigger conditions must be intentional. Fire the webhook when a build-relevant content entity becomes Published, when already-published buildable content changes, when a buildable published entity is unpublished or deleted, and when menu links in configured Linkset menus change. Do not fire on Draft-only saves that leave the published version unchanged. The webhook payload should be simple JSON that includes the event type, entity type, bundle or resource type, canonical identifier, moderation state when available, and a timestamp. The payload is for observability only; the remote build system does not need Drupal internals to decide whether to rebuild.

Keep configuration simple and local-first. The generated Drupal site needs one optional webhook URL setting. The easiest path is to add a setup prompt and `.env.example` documentation for `ASTRO_BUILD_WEBHOOK_URL`, then have `setup/ui.js` write that value into both the root `.env` and the generated Drupal configuration or settings consumed by the custom module. If the user leaves the value blank, setup must still succeed, the module should log that automatic rebuilds are disabled, and the manual workflow in `docs/publishing.md` remains the default.

The webhook call must never block or fail a Drupal content save. Use a short timeout, catch network errors, and log failures clearly in Drupal logs and setup docs. Avoid introducing an external queue service, message broker, or always-on relay. A single outbound POST is enough for V1.

Acceptance for this milestone is behavioral: with a test webhook URL configured, publishing a page or changing a menu causes Drupal to send exactly one rebuild notification; saving a Draft does not; and disconnecting the webhook endpoint logs an error without breaking editorial saves.

### Milestone 4: Replace the implicit page-only assumption with an explicit Astro content contract

With navigation ownership and publish semantics clear, make the frontend contract explicit. Add `templates/astro-src/config/drupal-astro-kit.config.ts` and define the smallest useful typed surface for developers:

    export type DrupalResourceType = string;

    export interface DrupalContentTypeMapping {
      component: string;
      routable?: boolean;
      label?: string;
    }

    export interface DrupalMenuMapping {
      machineName: string;
      key: string;
    }

    export interface DrupalAstroKitConfig {
      apiBaseUrl: string;
      contentTypes: Record<DrupalResourceType, DrupalContentTypeMapping>;
      menus?: DrupalMenuMapping[];
    }

The default export in that file should use the repo’s existing environment contract, so `apiBaseUrl` should come from `import.meta.env.DRUPAL_BASE_URL` rather than inventing a second base-url environment variable. Start with a default config that declares `node--page` and `node--article` as routable and `main` plus `footer` as the menus Astro fetches.

Do not make developers configure fields or routes in this file. Astro should continue to derive routes from Drupal path aliases and should continue passing the resource payload into the mapped renderer. The only question this config answers is: which Drupal resource types should become pages, and which Astro component renders each one?

Refactor `templates/astro-src/lib/drupal.ts` so it can fetch configured resource collections instead of hardcoding only `/jsonapi/node/page`. Introduce a small component registry, for example in `templates/astro-src/lib/drupal-renderers.ts` or `templates/astro-src/components/pages/index.ts`, that maps the config’s component keys such as `BasicPage` and `ArticlePage` to actual Astro components. Update `templates/astro-src/pages/[...slug].astro` and `templates/astro-src/pages/index.astro` so they filter out resource types not declared in the config, load the mapped renderer, and continue using the Drupal alias as the route source.

If the frontend encounters a published Drupal resource type that is not declared in `contentTypes`, it should skip it and log a warning. If a declared renderer key does not exist in the component registry, fail the build with a clear error that names the missing key and the config file to edit.

Acceptance for this milestone is easy to observe: the generated Astro site only creates routes for configured resource types, `node--page` and `node--article` can render through distinct component keys, and menus are fetched from the `menus` config instead of being hardcoded in the layout data layer.

### Milestone 5: Update docs, audits, and deployment guidance around the new bridge

After the code changes land, update the repository docs so a novice can follow the full authored-to-built workflow without guessing. `README.md` should explain the four bridge pieces plainly: Drupal owns menus through Linkset, moderation states define what is ready, publish events can optionally trigger rebuilds, and Astro only consumes resource types declared in its config contract. `docs/publishing.md` should keep the manual rebuild flow as the default but add a short section explaining the optional webhook automation. `docs/architecture.md` should mention moderation and the content contract in the data-flow description.

Update the audit toolkit conservatively. Extend `audit/scripts/jsonapi_audit.js` or the closest existing setup audit so it checks the required Linkset endpoint and confirms moderation modules are enabled when a local Drupal instance is available. Extend `audit/scripts/build_contract_audit.js` so it can verify that the generated frontend contains `src/config/drupal-astro-kit.config.ts`, that the default menu keys exist, and that build output reflects only configured resource types. Do not build a large new audit subsystem just for this milestone.

Acceptance for this milestone is clarity plus proof: a newcomer can read the docs, run the audit commands, and understand what Drupal publication means, what triggers a rebuild, and how Astro decides what to build.

## Concrete Steps

Run the following commands from the repo root unless a different working directory is shown.

1. Confirm the current baseline before editing more source-of-truth files.

    pwd
    sed -n '1,220p' setup/drupal-recipes/dak_decoupled_base/recipe.yml
    sed -n '1,260p' templates/astro-src/lib/drupal.ts
    sed -n '1,220p' docs/publishing.md

   Expected observation: Linkset is already enabled, menu fetching already exists, manual rebuild publishing is already documented, and page fetching is still hardcoded to `node--page`.

2. Run a fresh clean setup to close the remaining Linkset validation gap before broadening the bridge.

    chmod +x ./setup.sh
    ./setup.sh

   Use a fresh working directory or remove prior generated outputs first. Expected observation: `drupal-backend/` and `astro-frontend/` are recreated successfully, Drupal responds at `/system/menu/main/linkset`, and Astro can build with the seeded menu content.

3. Validate moderation after implementing the editorial recipe.

    cd drupal-backend
    ddev exec drush pm:list --status=enabled | rg 'workflows|content_moderation'
    ddev exec drush cget workflows.workflow.editorial

   Expected observation: both modules are enabled, and the editorial workflow config is present. Then open Drupal at `http://<project>.ddev.site/admin/content`, edit a Basic page, save it as Draft, and verify the currently built Astro output does not change until the page is Published and rebuilt.

4. Validate the publish webhook bridge with a disposable local receiver.

    python3 - <<'PY'
    from http.server import BaseHTTPRequestHandler, HTTPServer
    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            length = int(self.headers.get('Content-Length', '0'))
            body = self.rfile.read(length).decode()
            print('POST', self.path)
            print(body)
            self.send_response(204)
            self.end_headers()
    HTTPServer(('127.0.0.1', 8787), Handler).serve_forever()
    PY

   In another terminal, configure `ASTRO_BUILD_WEBHOOK_URL=http://127.0.0.1:8787/rebuild`, publish a page or change a main-menu item in Drupal, and watch the receiver print a single POST payload. Save the same content as Draft only and confirm no POST is sent.

5. Validate the Astro content contract after implementing the config file and renderer registry.

    sed -n '1,220p' templates/astro-src/config/drupal-astro-kit.config.ts
    cd astro-frontend
    npm run build
    rg -n 'node--page|node--article|main|footer' src/config src/lib src/pages

   Expected observation: the config file names the routable Drupal resource types and menus, the build succeeds, and the generated route logic reads from the config instead of hardcoding only `node--page`.

6. Validate end-to-end publishing behavior.

    cd astro-frontend
    npm run build
    rg -n 'Home|About|Contact' dist

   Then publish a Drupal page change, confirm the webhook fires, rerun or observe the configured build pipeline, and verify the updated HTML appears in `dist/` and later in the deployed Pages site.

## Validation and Acceptance

This work is accepted only when all of the following are true:

- A fresh `./setup.sh` run still succeeds and produces working Linkset-backed navigation.
- Drupal edit forms for Basic pages and Articles expose moderation-state controls after setup.
- Saving a Draft does not change what Astro is eligible to build, while transitioning content to Published does.
- With a webhook configured, publishing build-relevant content or editing configured menus sends one rebuild notification; with no webhook configured, manual publishing still works and the kit documents that clearly.
- Astro builds only the Drupal resource types declared in `src/config/drupal-astro-kit.config.ts` and ignores undeclared resource types.
- The typed config declares menus separately from content types, and the layout fetches menus from that config rather than from hardcoded names.
- `cd astro-frontend && npm run build` succeeds and produces static HTML that still works with Drupal offline.
- The relevant audit commands pass and explain failures in plain language.

The most important human check is this: an editor can tell the difference between Draft and Published in Drupal, and a developer can tell the difference between “ready in Drupal” and “live on the site” by looking at the webhook/build/deploy flow. If that distinction is still fuzzy, the bridge is not strong enough yet.

## Idempotence and Recovery

This plan must remain safe to rerun. Setup should keep copying recipes and custom modules into fresh generated projects without mutating checked-in source-of-truth unexpectedly. Starter content must stay published after setup so the generated Astro app builds on the first run even when moderation is enabled.

If the clean setup run fails before the new workflow work starts, repair the existing Linkset baseline first. Do not layer moderation or webhook changes on top of a flaky navigation setup. If the moderation recipe applies incorrectly, recover by inspecting the generated Drupal config with Drush before touching Astro code. If the webhook endpoint is down, Drupal must log the failure and continue saving content. If the Astro build fails after the content-contract refactor, start recovery in `templates/astro-src/config/drupal-astro-kit.config.ts` and the renderer registry rather than hardcoding `node--page` assumptions back into the routes.

The safe rollback path for the webhook bridge is to clear the configured webhook URL and fall back to the documented manual rebuild flow. The safe rollback path for the content contract is to keep `node--page` mapped to the existing page renderer while fixing any additional resource-type mappings.

## Artifacts and Notes

Keep the most useful proof snippets concise.

Example webhook payload proof:

    POST /rebuild
    {"event":"content.published","entityType":"node","bundle":"page","resourceType":"node--page","id":"3f...","moderationState":"published","timestamp":"2026-03-13T15:30:00Z"}

Example moderation proof:

    $ cd drupal-backend && ddev exec drush pm:list --status=enabled | rg 'workflows|content_moderation'
      Content Moderation  content_moderation  Enabled
      Workflows           workflows           Enabled

Example content-contract proof:

    export default {
      apiBaseUrl: import.meta.env.DRUPAL_BASE_URL,
      contentTypes: {
        'node--page': { label: 'Basic Page', component: 'BasicPage', routable: true },
        'node--article': { label: 'Article', component: 'ArticlePage', routable: true },
      },
      menus: [
        { key: 'main', machineName: 'main' },
        { key: 'footer', machineName: 'footer' },
      ],
    };

If the implementation chooses different workflow state labels or a slightly different webhook payload, update this section with the real output while keeping the same authored-to-built behavior.

## Interfaces and Dependencies

In `setup/drupal-recipes/dak_editorial_workflow/recipe.yml`, define a Drupal recipe that enables:

    workflows
    content_moderation

and imports the workflow configuration needed for Basic pages and Articles.

In `setup/drupal-modules/dak_publish_bridge/`, define a tiny Drupal custom module with at least:

- `dak_publish_bridge.info.yml`
- a service definition if needed for HTTP posting
- a PHP class or hook implementation that detects relevant content and menu changes
- a settings source for the optional webhook URL

The module must expose a small, stable behavior contract: given a published content or menu change, POST one JSON payload to the configured endpoint; given no configured endpoint, log that automatic rebuilds are disabled and return.

In `templates/astro-src/config/drupal-astro-kit.config.ts`, define:

    export type DrupalResourceType = string;

    export interface DrupalContentTypeMapping {
      component: string;
      routable?: boolean;
      label?: string;
    }

    export interface DrupalMenuMapping {
      machineName: string;
      key: string;
    }

    export interface DrupalAstroKitConfig {
      apiBaseUrl: string;
      contentTypes: Record<DrupalResourceType, DrupalContentTypeMapping>;
      menus?: DrupalMenuMapping[];
    }

In Astro source, add a stable renderer registry with keys that match the config file, for example:

    export const pageRenderers = {
      BasicPage,
      ArticlePage,
    };

In `templates/astro-src/lib/drupal.ts`, replace the page-only fetch assumption with functions that can fetch all configured resource types, normalize aliases, and skip undeclared types safely. The menu API should continue using Linkset, but the selected menu names should come from config rather than from hardcoded string literals.

The implementation must stay within existing repo dependencies where possible. Reuse Drupal core modules for workflow and moderation, use the repo’s existing Node/Astro fetch stack, and avoid adding a preview service, SSR adapter, or external synchronization infrastructure.

## Revision Notes

- (2026-03-13 / agent) Created the original Linkset-focused ExecPlan because the repo had a strong page-content story but no Drupal-owned navigation story.
- (2026-03-13 / agent) Updated the plan after Linkset implementation to mark completed milestones, record the duplicate `Home` discovery on Drupal Standard installs, and leave the remaining fresh clean setup validation task visible.
- (2026-03-13 / agent) Expanded the plan from “Linkset only” to the broader authored-to-built bridge after repo review showed Linkset is landed, while editorial workflow, publish-triggered rebuilds, and an explicit Astro content contract are still missing.
- (2026-03-13 / agent) Executed Milestone 1 validation in disposable DDEV copies, recorded the `/tmp` versus `/private/tmp` realpath hazard, documented that the first clean-run failure was broader than Linkset alone, and updated the plan so the remaining clean-run proof is explicit instead of implied.
