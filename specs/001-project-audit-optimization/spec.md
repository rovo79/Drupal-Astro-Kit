# Feature Specification: Project Audit & Optimization

**Feature Branch**: `001-project-audit-optimization`  
**Created**: 2025-11-07  
**Status**: Draft  
**Input**: User description: "Analyze existing Drupal + Astro + Cloudflare project to validate functionality and identify optimization opportunities across setup automation, SSR performance, KV usage, CI/CD, and documentation accuracy."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Validate end-to-end setup flow (Priority: P1)

As a maintainer, I want to run a single setup command to provision Drupal (DDEV), Astro, and Cloudflare config so that a new developer can start the project without manual steps (except KV namespace ID).

**Why this priority**: Onboarding and reproducibility are foundational; if setup fails, nothing else proceeds.

**Independent Test**: Run `./setup.sh` in a clean workspace and verify generated artifacts and services are reachable.

**Acceptance Scenarios**:

1. Given a clean repo and prerequisites installed, When I run `./setup.sh`, Then `.env` is created from `.env.example` with `PROJECT_NAME` set to the directory name and `DRUPAL_API_URL` appended.
2. Given the setup completes, When I navigate to `http://{PROJECT_NAME}.ddev.site`, Then the Drupal site loads successfully.
3. Given the setup completes, When I open `wrangler.toml`, Then it exists at repo root and references `./astro-frontend/dist/_worker.js/index.js` and `[assets]` binding `ASSETS`.
4. Given the setup completes, When I inspect `astro-frontend/astro.config.mjs`, Then SSR is enabled globally with the Cloudflare adapter.

---

### User Story 2 - Verify SSR behavior locally and on Workers (Priority: P1)

As a developer, I want consistent SSR behavior between Astro dev and Workers dev so that features render similarly across environments.

**Why this priority**: Prevents environment drift; SSR is the default rendering mode.

**Independent Test**: Start Astro dev and Workers dev; confirm dynamic pages render with SSR in both.

**Acceptance Scenarios**:

1. Given Astro dev is running, When I open `http://localhost:4321`, Then dynamic pages render with SSR (no prerender-only failures).
2. Given Workers dev is running (`npx wrangler dev --remote`), When I open `http://localhost:8787`, Then pages render with SSR and KV binding `SESSION` is accessible via `Astro.locals.runtime.env`.
3. Given `export const prerender = true` is used on a static page, When building, Then the page is emitted as static while other routes remain SSR.

---

### User Story 3 - Validate Drupal JSON:API integration (Priority: P1)

As a frontend engineer, I want to fetch content from Drupal JSON:API using `jsona` and `drupal-jsonapi-params` so that data is normalized and queries are expressive.

**Why this priority**: Content delivery is the core function of the app.

**Independent Test**: Implement a sample fetch in an Astro page frontmatter that queries the local Drupal JSON:API endpoint.

**Acceptance Scenarios**:

1. Given Drupal is running at `http://{PROJECT_NAME}.ddev.site`, When I fetch `/jsonapi` from the frontend, Then responses are deserialized via `jsona` and rendered.
2. Given the need to filter or include related entities, When I build params with `drupal-jsonapi-params`, Then the resulting query fetches expected fields and relationships.
3. Given network errors, When the fetch fails, Then errors are logged and surfaced in dev with actionable messages.

---

### User Story 4 - KV namespace setup and usage (Priority: P2)

As an operator, I want a reliable KV `SESSION` binding configured so that session or lightweight cache state can be stored at the edge.

**Why this priority**: Required for session-like features and some caching patterns.

**Independent Test**: Create KV namespace, update `wrangler.toml`, verify read/write from a page/server handler.

**Acceptance Scenarios**:

1. Given the CLI provides KV setup instructions, When I create a namespace via `npx wrangler kv namespace create "SESSION"`, Then the ID is returned and documented.
2. Given the namespace ID is added, When I run `npx wrangler dev --remote`, Then `Astro.locals.runtime.env.SESSION` is available and can read/write a test key.
3. Given production deploy, When I access the Worker, Then KV reads/writes succeed and errors are observable via Cloudflare logs.

---

### User Story 5 - CI/CD pipeline verification (Priority: P2)

As a maintainer, I want CI to validate configuration and build artifacts and deploy on staging/main so that releases are predictable.

**Why this priority**: Ensures deployments are reproducible and gated.

**Independent Test**: Push to staging/main and observe workflow steps executing as documented.

**Acceptance Scenarios**:

1. Given the workflow is triggered on `staging` or `main`, When jobs run, Then validation fails fast if `.env` or `wrangler.toml` are missing.
2. Given frontend job runs, When it builds, Then the build uses branch-specific env values and produces the expected Workers bundle path.
3. Given backend job runs, When DDEV setup executes, Then composer install and drush tasks complete without errors.

---

### User Story 6 - Documentation accuracy and drift check (Priority: P3)

As a contributor, I want README and docs to reflect the actual code paths so that new devs aren't misled.

**Why this priority**: Reduces support burden and confusion.

**Independent Test**: Cross-check docs with code and generated files; compile a diff of mismatches and fix list.

**Acceptance Scenarios**:

1. Given current docs, When I compare `docs/` against `setup/ui.js` outputs and `wrangler.toml`, Then instructions match generated file paths and flags.
2. Given deploy script behavior, When I compare with `docs/deployment.md`, Then steps and environment variables align.
3. Given GitHub Actions configuration, When I compare with `docs/github-actions.md`, Then triggers, secrets, and environment mappings match.

### Edge Cases

- Missing KV namespace ID in `wrangler.toml` → Workers build runs but runtime access to `SESSION` fails: instruction must point to KV creation and ID update.
- Astro output path changes → `wrangler.toml` `main` no longer valid: CI validation should catch and docs must update.
- DDEV not installed or Docker unavailable → setup fails early with clear error and remediation steps.
- Network/CORS issues between Astro and Drupal in dev → show actionable error and suggest using exact DDEV hostname from `.env`.
- Inconsistent `PROJECT_NAME` after renaming directory → regenerate `.env` or re-run setup with updated name.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001 (Setup)**: A single command (`./setup.sh`) MUST provision `.env`, DDEV Drupal, Astro app, and `wrangler.toml` with correct defaults.
- **FR-002 (SSR)**: The frontend MUST default to SSR (`output: 'server'`), with per-page opt-in to static via `export const prerender = true`.
- **FR-003 (API Integration)**: Frontend MUST consume Drupal JSON:API and use `jsona` for deserialization and `drupal-jsonapi-params` for queries.
- **FR-004 (KV Binding)**: A `SESSION` KV binding MUST be configured in `wrangler.toml`; documentation MUST guide creation and ID update.
- **FR-005 (Workers Build Path)**: `wrangler.toml` MUST point to `./astro-frontend/dist/_worker.js/index.js` and define `[assets]` binding `ASSETS`.
- **FR-006 (CI/CD)**: GitHub Actions MUST validate required files, build frontend, run backend tasks with DDEV, and deploy on `staging`/`main` with branch-appropriate env.
- **FR-007 (Docs)**: Documentation MUST reflect actual setup outputs, paths, commands, and environment requirements.

### Key Entities *(include if feature involves data)*

- **Environment Configuration**: `.env` values (PROJECT_NAME, API URLs) governing local and deploy behavior.
- **Workers Configuration**: `wrangler.toml` entries (`main`, `[assets]`, `kv_namespaces`, `compatibility_flags`).
- **Setup Artifacts**: Generated directories/files: `drupal-backend/`, `astro-frontend/`, `astro-frontend/astro.config.mjs`.
- **Verification Reports**: Human-readable notes from validation steps (setup, integration, deployment), optionally summarized in PR.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001 (Setup)**: Fresh setup completes under 10 minutes on a typical dev machine without manual edits (except KV ID), producing a reachable DDEV site and valid configs.
- **SC-002 (SSR Parity)**: Dynamic pages render in both Astro dev and Workers dev with consistent behavior; no SSR-only or dev-only regressions.
- **SC-003 (API Integration)**: At least one page renders data fetched from Drupal JSON:API using `jsona` and `drupal-jsonapi-params` successfully.
- **SC-004 (Workers Build Path)**: Workers deployment serves the site from expected URL and the built entry aligns with `wrangler.toml`.
- **SC-005 (Docs Accuracy)**: Zero mismatches between docs and current code paths/configs in a drift check pass.
