# Tasks: Drupal Headless JSON:API Profile (V1 Minimal)

**Input**: Design documents from `/specs/002-drupal-api-config/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not explicitly requested in spec; using manual independent test criteria per user story. No automated test implementation tasks included for V1.

**Organization**: Tasks grouped by user story to enable independent implementation and validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency ordering conflicts)
- **[Story]**: User story label (US1..US6) only for user-story phases
- All file paths are absolute or resolvable from repo root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure baseline environment, automation, and configuration are in place (most already delivered by existing setup tooling, but tasks listed for completeness and traceability).

- [X] T001 Validate presence of setup script at /Users/rob/Dev/Drupal_Astro_Kit/setup.sh
- [X] T002 [P] Confirm `.env` generated from `.env.example` and contains PROJECT_NAME at /Users/rob/Dev/Drupal_Astro_Kit/.env
- [X] T003 [P] Ensure `wrangler.toml` exists at /Users/rob/Dev/Drupal_Astro_Kit/wrangler.toml with expected Cloudflare config
- [X] T004 [P] Verify Drupal backend directory creation (post-setup) at /Users/rob/Dev/Drupal_Astro_Kit/drupal-backend (may not yet exist before running setup)
- [X] T005 [P] Verify Astro frontend directory exists at /Users/rob/Dev/Drupal_Astro_Kit/astro-frontend
- [X] T006 Capture KV namespace setup instructions in docs update (if missing) at /Users/rob/Dev/Drupal_Astro_Kit/docs/troubleshooting.md
- [X] T007 Confirm `jsona` and `drupal-jsonapi-params` dependencies listed in /Users/rob/Dev/Drupal_Astro_Kit/astro-frontend/package.json
- [X] T008 Record manual validation steps from quickstart.md into audit script reference at /Users/rob/Dev/Drupal_Astro_Kit/audit/scripts/jsonapi_audit.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Specific bootstrap tasks to guarantee a working page content type and CORS configuration. All must complete before user story phases.

- [X] T009 Create/validate page content type programmatic creation script (Drush eval) in /Users/rob/Dev/Drupal_Astro_Kit/setup/ui.js
- [X] T010 [P] Ensure fields (field_slug, field_summary, field_body) creation logic present in /Users/rob/Dev/Drupal_Astro_Kit/setup/ui.js
- [X] T011 [P] Add uniqueness guidance for field_slug validation comment in /Users/rob/Dev/Drupal_Astro_Kit/setup/ui.js
- [X] T012 [P] Inject CORS configuration generation (services.yml write) into setup flow at /Users/rob/Dev/Drupal_Astro_Kit/setup/ui.js
- [X] T013 [P] Verify anonymous 'access content' permission set via bootstrap in /Users/rob/Dev/Drupal_Astro_Kit/setup/ui.js
- [X] T014 Ensure quickstart curl endpoint documented matches spec at /Users/rob/Dev/Drupal_Astro_Kit/specs/002-drupal-api-config/quickstart.md
- [X] T015 Create constitution compliance checklist comment block in /Users/rob/Dev/Drupal_Astro_Kit/setup/ui.js

**Checkpoint**: Foundation complete → US1 and US2 can begin independently.

---

## Phase 3: User Story 1 - Working API Endpoint (Priority: P1) 🎯 MVP (US1)

**Goal**: Frontend developer can fetch page nodes immediately after setup using `/jsonapi/node/page?filter[status]=1&sort=-changed`.
**Independent Test**: Run setup; create sample page; curl endpoint returns JSON with expected fields; Astro `api-check.astro` renders list without errors.

### Tasks (US1 Implementation)

- [X] T016 [P] [US1] Add sparse fieldset example (fields param) to api-check page at /Users/rob/Dev/Drupal_Astro_Kit/astro-frontend/src/pages/api-check.astro
- [X] T017 [P] [US1] Add sorting (-changed) usage demonstration in /Users/rob/Dev/Drupal_Astro_Kit/astro-frontend/src/pages/api-check.astro
- [X] T018 [P] [US1] Ensure jsona deserialization pattern documented in /Users/rob/Dev/Drupal_Astro_Kit/astro-frontend/src/pages/api-check.astro
- [X] T019 [US1] Add error handling for failed fetch (network/JSON parse) in /Users/rob/Dev/Drupal_Astro_Kit/astro-frontend/src/pages/api-check.astro
- [X] T020 [US1] Add inline comment referencing OpenAPI contract at /Users/rob/Dev/Drupal_Astro_Kit/specs/002-drupal-api-config/contracts/openapi.yaml inside api-check.astro
- [X] T021 [US1] Include manual validation instructions link to quickstart in /Users/rob/Dev/Drupal_Astro_Kit/astro-frontend/src/pages/api-check.astro

**Checkpoint**: US1 independently verifiable.

---

## Phase 4: User Story 2 - Cross-Origin Access (Priority: P1) (US2)

**Goal**: Astro frontend (localhost:4321) and Workers dev domain can access JSON:API without CORS issues.
**Independent Test**: Browser fetch from api-check page succeeds; OPTIONS preflight from Workers origin returns correct headers.

### Tasks (US2 Implementation)

- [X] T022 [P] [US2] Add explicit CORS header verification log snippet to /Users/rob/Dev/Drupal_Astro_Kit/astro-frontend/src/pages/api-check.astro
- [X] T023 [P] [US2] Document preflight curl example in /Users/rob/Dev/Drupal_Astro_Kit/specs/002-drupal-api-config/quickstart.md (already present, verify and refine)
- [X] T024 [US2] Add services.yml CORS section cross-reference comment to /Users/rob/Dev/Drupal_Astro_Kit/setup/ui.js
- [X] T025 [US2] Add note on allowed origins derivation from PROJECT_NAME in /Users/rob/Dev/Drupal_Astro_Kit/docs/troubleshooting.md

**Checkpoint**: US2 independently verifiable (CORS logs and preflight test pass).

---

## Phase 5: User Story 3 - Performance (Priority: P2) (US3) — Deferred Scope

**Goal**: Prepare placeholders for future caching optimization (deferred; minimal tasks establish TODO markers only without implementing caching logic in V1).
**Independent Test** (Deferred): Repeated requests show Drupal core cache headers.

### Marker Tasks (US3 Performance)

- [X] T026 [P] [US3] Insert TODO performance optimization comment in /Users/rob/Dev/Drupal_Astro_Kit/setup/ui.js
- [X] T027 [P] [US3] Add placeholder section in audit script for performance in /Users/rob/Dev/Drupal_Astro_Kit/audit/scripts/jsonapi_audit.js

**Checkpoint**: US3 markers present; real implementation deferred.

---

## Phase 6: User Story 4 - Security Hardening (Priority: P2) (US4) — Deferred Scope

**Goal**: Baseline security markers for future audit (avoid sensitive data exposure).
**Independent Test** (Deferred): Anonymous requests to user resources blocked or sanitized.

### Marker Tasks (US4 Security)

- [X] T028 [P] [US4] Add security audit TODO in /Users/rob/Dev/Drupal_Astro_Kit/audit/scripts/jsonapi_audit.js
- [X] T029 [US4] Add note about user endpoint restriction in /Users/rob/Dev/Drupal_Astro_Kit/docs/troubleshooting.md

**Checkpoint**: US4 markers present; real implementation deferred.

---

## Phase 7: User Story 5 - Additional Content Modeling (Priority: P3) (US5) — Deferred Scope

**Goal**: Content modeling conventions for future types (article, taxonomy).
**Independent Test** (Deferred): New content type respects naming conventions and appears in JSON:API.

### Marker Tasks (US5 Content Modeling)

- [X] T030 [P] [US5] Add TODO block for additional bundles in /Users/rob/Dev/Drupal_Astro_Kit/setup/ui.js
- [X] T031 [US5] Add guidance paragraph for naming in /Users/rob/Dev/Drupal_Astro_Kit/docs/architecture.md

**Checkpoint**: US5 markers present; real implementation deferred.

---

## Phase 8: User Story 6 - Configuration as Code (Priority: P3) (US6) — Deferred Scope

**Goal**: Prepare for future shift to CMI + config split.
**Independent Test** (Deferred): Export/import reproduces API settings.

### Marker Tasks (US6 Config as Code)

- [X] T032 [P] [US6] Insert TODO for jsonapi_extras export in /Users/rob/Dev/Drupal_Astro_Kit/docs/deployment.md
- [X] T033 [US6] Add placeholder section for config split strategy in /Users/rob/Dev/Drupal_Astro_Kit/docs/architecture.md

**Checkpoint**: US6 markers present; real implementation deferred.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improve clarity, maintainability, and future readiness post core V1 tasks.

- [X] T034 [P] Consolidate inline TODO markers across codebase in /Users/rob/Dev/Drupal_Astro_Kit
- [X] T035 [P] Add cross-reference links (spec ↔ quickstart ↔ audit) in /Users/rob/Dev/Drupal_Astro_Kit/specs/002-drupal-api-config/plan.md
- [X] T036 Refine OpenAPI description language for clarity in /Users/rob/Dev/Drupal_Astro_Kit/specs/002-drupal-api-config/contracts/openapi.yaml
- [X] T037 Add explicit link to OpenAPI doc in /Users/rob/Dev/Drupal_Astro_Kit/README.md
- [ ] T038 Run quickstart validation steps and record outcomes in /Users/rob/Dev/Drupal_Astro_Kit/audit/report/audit-report.md


---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) → Must precede Foundational
- Foundational (Phase 2) → Blocks all user stories (US1..US6)
- User Stories: US1 and US2 (both P1) can run in parallel after Phase 2
- Deferred stories (US3..US6) only require marker tasks; can run anytime post Phase 2
- Polish (Phase 9) requires completion of essential P1 tasks (US1, US2)

### User Story Dependencies

- US1: None beyond Phase 2 completion
- US2: None beyond Phase 2 completion (independent of US1 but complements it)
- US3..US6: Deferred marker tasks; no functional dependency, but rely on page content type existence

### Within User Stories

- Parallel tasks (marked [P]) focus on distinct files (api-check.astro modifications, docs updates)
- Non-parallel tasks ensure sequencing where context or aggregation needed (e.g., adding comments referencing contract)

### Parallel Opportunities

- Setup: T002–T007 can run concurrently
- Foundational: T010–T013 can run concurrently after T009 baseline creation
- US1: T016–T018 can run concurrently; T019–T021 depend on context consolidation
- US2: T022–T023 concurrent; T024–T025 sequential docs alignment
- Deferred stories mostly parallel (marker tasks)
- Polish: T034–T037 parallel, then T038 validation last

---

## Parallel Example: User Story 1

```text
Parallel batch 1:
  - T016 [US1] Add sparse fieldset example (api-check.astro)
  - T017 [US1] Add sorting example (api-check.astro)
  - T018 [US1] Ensure jsona deserialization pattern (api-check.astro)
Then sequential:
  - T019 [US1] Error handling improvements
  - T020 [US1] Contract reference comment
  - T021 [US1] Link to quickstart instructions
```

---

## Implementation Strategy

### MVP (Deliver US1 Only)

1. Complete Phase 1 & 2
2. Execute US1 tasks (T016–T021)
3. Run independent test (curl + api-check page)
4. Record validation in audit report

### Incremental Delivery

- Add US2 for cross-origin verification
- Defer performance/security/modeling/config mgmt to future sprints (US3–US6 markers already placed)
- Polish phase after P1 completion consolidates docs and references

### Team Parallelization

- One contributor: sequential through MVP then US2
- Multiple contributors: split US1 parallel batch; assign US2 tasks separately; markers can be placed by any contributor

---

## Notes

- Tasks adhere to required format: `- [ ] ID [P?] [Story?] Description with file path`
- No test implementation tasks added (manual gates per specification)
- Marker tasks ensure traceability for deferred scope without premature implementation

