# Tasks: Static-First SSG Refactor

**Input**: Design documents from `/specs/003-static-ssg-refactor/`
**Prerequisites**: plan.md ✅, spec.md ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Remove SSR Artifacts)

**Purpose**: Clean slate - remove Workers/SSR configuration to prepare for static-first architecture

- [X] T001 Remove `wrangler.toml` Workers configuration from project root
- [X] T002 [P] Remove KV binding references from any existing config files
- [X] T003 [P] Remove `@astrojs/cloudflare` adapter from astro-frontend/package.json if present
- [X] T004 [P] Delete SSR-specific pages (kv-check.astro, api-check.astro) from astro-frontend/src/pages/
- [X] T005 Update .env.example to remove Workers-specific variables (keep API_BASE_URL)

---

## Phase 2: Foundational (Static Build Infrastructure)

**Purpose**: Core infrastructure that MUST be complete before user stories can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Configure astro.config.mjs with `output: 'static'` (no adapter) in astro-frontend/
- [X] T007 [P] Create wrangler.jsonc for Cloudflare Pages in astro-frontend/ (name, compatibility_date, pages_build_output_dir: ./dist)
- [X] T008 [P] Create Drupal JSON:API client with pagination support in astro-frontend/src/lib/drupal.ts
- [X] T009 [P] Create Base.astro layout component in astro-frontend/src/layouts/Base.astro
- [X] T010 Update setup/ui.js to scaffold static-mode Astro project (remove SSR adapter install)

**Checkpoint**: Static build infrastructure ready - user story implementation can begin

---

## Phase 3: User Story 1 - One-Command Project Setup (Priority: P1) 🎯 MVP

**Goal**: Developer runs `./setup.sh` and gets working Drupal + Astro environment with sample content

**Independent Test**: Clone repo, run `./setup.sh`, visit DDEV URL, run Astro dev server - sample pages render

### Implementation for User Story 1

- [X] T011 [US1] Update setup/ui.js to prompt for project name and admin credentials
- [X] T012 [US1] Update setup/ui.js to configure DDEV with project name-based URLs
- [X] T013 [P] [US1] Create Drupal recipe or config for Page content type with body + path alias in setup/drupal-config/
- [X] T014 [P] [US1] Create Drupal recipe for JSON:API + Pathauto modules enablement in setup/drupal-config/
- [X] T015 [P] [US1] Create Drupal recipe for CORS configuration (allow localhost:4321) in setup/drupal-config/
- [X] T016 [US1] Update setup/ui.js to apply Drupal recipes after installation
- [X] T017 [US1] Create scripts/seed-content.sh to create Homepage (/), About (/about), Contact (/contact) via Drush
- [X] T018 [US1] Update setup/ui.js to run seed-content.sh after Drupal setup
- [X] T019 [US1] Update setup/ui.js to generate .env with API_BASE_URL pointing to DDEV site
- [X] T020 [US1] Update setup/ui.js to copy .env to astro-frontend/ during scaffold

**Checkpoint**: `./setup.sh` produces working Drupal with sample content + Astro project configured

---

## Phase 4: User Story 2 - Local Content Authoring (Priority: P1)

**Goal**: Editor creates pages in Drupal, content appears in JSON:API with aliases

**Independent Test**: Create page in Drupal with alias, fetch `/jsonapi/node/page` - see content and alias

### Implementation for User Story 2

- [X] T021 [US2] Verify JSON:API exposes path alias field and allows anonymous read access
- [X] T022 [US2] Document JSON:API response structure for Page nodes in specs/003-static-ssg-refactor/contracts/jsonapi-page.md
- [X] T023 [US2] Test JSON:API pagination with >50 pages and document expected behavior

**Checkpoint**: Drupal JSON:API returns pages with aliases - ready for Astro consumption

---

## Phase 5: User Story 3 - Static Site Build (Priority: P1)

**Goal**: `npm run build` generates static HTML files matching Drupal page aliases

**Independent Test**: Run `npm run build`, check `dist/` contains `about/index.html`, `contact/index.html`, `index.html`

### Implementation for User Story 3

- [X] T024 [US3] Create [...slug].astro dynamic route in astro-frontend/src/pages/[...slug].astro
- [X] T025 [US3] Implement getStaticPaths() in [...slug].astro to fetch all pages from JSON:API
- [X] T025a [US3] Add alias conflict detection in getStaticPaths() - fail build with clear error if duplicates found
- [X] T026 [US3] Handle pagination in getStaticPaths() using drupal.ts client
- [X] T027 [US3] Map Drupal aliases to Astro route params (handle `/` as homepage, encode special characters)
- [X] T028 [US3] Render page body HTML using Astro set:html directive in [...slug].astro
- [X] T029 [US3] Add clear error handling when Drupal JSON:API is unreachable
- [X] T030 [US3] Add warning log for pages without aliases (skip during build)
- [X] T031 [US3] Add warning log when Drupal has no content (empty site builds with warning)

**Checkpoint**: `npm run build` produces complete static site in `dist/` - no runtime dependencies

---

## Phase 6: User Story 4 - Cloudflare Pages Deployment (Priority: P2)

**Goal**: `wrangler pages deploy` uploads static site to Cloudflare Pages

**Independent Test**: Run deploy script, visit production URL - pages load without Drupal running

### Implementation for User Story 4

- [X] T032 [US4] Update scripts/deploy-frontend.sh to use `wrangler pages deploy ./dist`
- [X] T033 [US4] Update scripts/deploy-frontend.sh to build Astro before deploy (`npm run build`)
- [X] T034 [US4] Add deploy instructions to README.md (Cloudflare Pages setup)

**Checkpoint**: Static site deployed and accessible at Cloudflare Pages URL

---

## Phase 7: User Story 5 - Development Workflow (Priority: P2)

**Goal**: Developer runs `npm run dev`, sees Drupal content with hot reload for Astro changes

**Independent Test**: Run `npm run dev`, edit Astro component - changes appear immediately; refresh to see Drupal content updates

### Implementation for User Story 5

- [X] T035 [US5] Verify Astro dev server fetches fresh content on navigation (default behavior)
- [X] T036 [P] [US5] Add npm scripts for common dev commands in astro-frontend/package.json
- [X] T037 [US5] Document dev workflow in README.md (start DDEV, start Astro dev, edit cycle)

**Checkpoint**: Full development workflow documented and working

---

## Phase 8: Polish & Documentation

**Purpose**: Documentation updates and cleanup for V1 release

- [X] T038 [P] Update README.md with static-first quick start (clone → setup → build → deploy)
- [X] T039 [P] Update docs/architecture.md with static-first diagram (remove Workers references)
- [X] T040 [P] Update docs/deployment.md for Cloudflare Pages (remove Workers instructions)
- [X] T041 [P] Update docs/troubleshooting.md (remove KV issues, add Pages-specific issues)
- [X] T042 [P] Add "V1 Static-Only" notice to README.md and docs (SSR is future scope)
- [X] T043 Update .github/copilot-instructions.md with static-first architecture notes
- [X] T044 Run full quickstart validation: fresh clone → setup → build → deploy → verify

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Phase 2 completion
  - US1, US2, US3 are P1 priority - complete first
  - US4, US5 are P2 priority - can start after US3
- **Phase 8 (Polish)**: Depends on all user stories complete

### User Story Dependencies

| Story | Priority | Can Start After | Dependencies |
|-------|----------|-----------------|--------------|
| US1 (Setup) | P1 | Phase 2 | None - first story |
| US2 (Authoring) | P1 | Phase 2 | US1 (needs working Drupal) |
| US3 (Build) | P1 | US2 | US1 + US2 (needs content to build) |
| US4 (Deploy) | P2 | US3 | US3 (needs dist/ to deploy) |
| US5 (Dev Workflow) | P2 | Phase 2 | Can run parallel to US4 |

### Parallel Opportunities

Within Phase 1:
```
T002, T003, T004 can run in parallel (different files)
```

Within Phase 2:
```
T007, T008, T009 can run in parallel (different files)
```

Within US1:
```
T013, T014, T015 can run in parallel (separate Drupal recipes)
```

Within Phase 8 (all parallel):
```
T039, T040, T041, T042, T043 can run in parallel (different docs)
```

---

## Implementation Strategy

### MVP First (User Stories 1-3)

1. Complete Phase 1: Remove SSR artifacts
2. Complete Phase 2: Static infrastructure
3. Complete US1: Working setup flow
4. Complete US2: Content authoring works
5. Complete US3: Static build works
6. **STOP and VALIDATE**: Full static workflow verified
7. Deploy manually to validate

### Incremental Delivery

1. Setup + Foundational → Static infrastructure ready
2. US1 → Test: `./setup.sh` works → Demo working setup
3. US2 → Test: JSON:API returns pages → Demo content authoring
4. US3 → Test: `npm run build` works → Demo static build (MVP!)
5. US4 → Test: Deploy works → Demo full pipeline
6. US5 + Polish → Test: Dev workflow smooth → V1 Release

---

## Summary

| Phase | Tasks | Purpose |
|-------|-------|---------|
| 1: Setup | T001-T005 | Remove SSR artifacts |
| 2: Foundational | T006-T010 | Static build infrastructure |
| 3: US1 Setup | T011-T020 | One-command project setup |
| 4: US2 Authoring | T021-T023 | Local content authoring |
| 5: US3 Build | T024-T031 | Static site generation |
| 6: US4 Deploy | T032-T034 | Cloudflare Pages deployment |
| 7: US5 Dev | T035-T037 | Development workflow |
| 8: Polish | T038-T044 | Documentation and validation |

**Total Tasks**: 45
**P1 Stories (MVP)**: US1, US2, US3 (25 tasks)
**P2 Stories**: US4, US5 (7 tasks)
**Setup + Polish**: 13 tasks
