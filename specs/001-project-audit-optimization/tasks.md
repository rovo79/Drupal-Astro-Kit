# Tasks: Project Audit & Optimization

**Input**: Design documents from `/specs/001-project-audit-optimization/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Manual validation only (per research decision D1). No automated test tasks included in this iteration.

**Organization**: Tasks are grouped by user story to enable independent implementation and validation of each slice.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unmet dependencies)
- **[Story]**: User story label (US1..US6) only within story phases
- Each task includes an exact file or directory path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish audit tooling scaffolding without altering existing application behavior.

- [X] T001 Create audit directory structure `audit/` (root)
- [X] T002 Create audit package manifest `audit/package.json` with dependencies: jsona, drupal-jsonapi-params, chalk, yargs
- [X] T003 [P] Add npm scripts to `audit/package.json` (audit:setup, audit:ssr, audit:api, audit:kv, audit:ci, audit:docs, audit:all)
- [X] T004 [P] Document audit usage in `audit/README.md` referencing `contracts/audit-report.schema.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core reusable helpers and aggregator required before any story-specific audit logic.

**⚠️ CRITICAL**: Must be complete before user story phases.

- [X] T005 Implement shared constants module `audit/scripts/util/constants.js`
- [X] T006 [P] Implement JSON:API client helper `audit/scripts/util/jsonapiClient.js`
- [X] T007 [P] Implement SSR fetch helper `audit/scripts/util/ssrFetch.js`
- [X] T008 [P] Implement KV test helper `audit/scripts/util/kvTest.js`
- [X] T009 Implement report aggregator entry `audit/index.js`
- [X] T010 Implement schema validation helper `audit/scripts/util/schemaValidate.js` consuming `specs/001-project-audit-optimization/contracts/audit-report.schema.json`

**Checkpoint**: Audit framework ready; story audit scripts can begin.

---

## Phase 3: User Story 1 - Validate end-to-end setup flow (Priority: P1) 🎯 MVP

**Goal**: Verify setup automation produces required artifacts and services are reachable.

**Independent Test**: Run `./setup.sh` in clean workspace; execute `node audit/index.js --target setup`; confirm generated artifacts & service reachability entries in report.

### Implementation Tasks — US1

- [X] T011 [US1] Implement setup audit script `audit/scripts/setup_audit.js`
- [X] T012 [P] [US1] Implement environment prerequisite checker `audit/scripts/check_env.js`
- [X] T013 [US1] Wire setup audit results aggregation in `audit/index.js` (add collector registration)

**Checkpoint**: Setup validation slice independently runnable.

---

## Phase 4: User Story 2 - Verify SSR behavior locally and on Workers (Priority: P1) ✅

**Goal**: Ensure SSR parity between Astro dev and Workers dev.

**Independent Test**: Run Astro dev + `wrangler dev --remote`; execute `node audit/index.js --target ssr`; compare snapshot metadata in report.

### Implementation Tasks — US2

- [X] T014 [US2] Implement SSR parity audit script `audit/scripts/ssr_parity_audit.js`
- [X] T015 [P] [US2] Implement page snapshot collector `audit/scripts/collect_snapshots.js`
- [X] T016 [US2] Integrate SSR audit results into aggregator `audit/index.js` (already wired)

**Checkpoint**: ✅ SSR parity verification independently runnable.

---

## Phase 5: User Story 3 - Validate Drupal JSON:API integration (Priority: P1) ✅

**Goal**: Confirm JSON:API fetch + normalization works with `jsona` & `drupal-jsonapi-params`.

**Independent Test**: Execute `node audit/index.js --target api`; verify deserialized sample collection in report.

### Implementation Tasks — US3

- [X] T017 [US3] Implement JSON:API audit script `audit/scripts/jsonapi_audit.js`
- [X] T018 [P] [US3] Add sample Astro page for API check `astro-frontend/src/pages/api-check.astro`
- [X] T019 [US3] Integrate JSON:API audit results into aggregator `audit/index.js`

**Checkpoint**: ✅ API integration verification independently runnable.

---

## Phase 6: User Story 4 - KV namespace setup and usage (Priority: P2)

**Goal**: Validate `SESSION` KV binding read/write cycle.

**Independent Test**: Run `wrangler dev --remote`; execute `node audit/index.js --target kv`; confirm write/read test key recorded.

### Implementation Tasks — US4

- [ ] T020 [US4] Implement KV audit script `audit/scripts/kv_audit.js`
- [ ] T021 [P] [US4] Add Workers runtime test page `astro-frontend/src/pages/kv-check.astro`
- [ ] T022 [US4] Integrate KV audit results into aggregator `audit/index.js`

**Checkpoint**: KV namespace usage verification independently runnable.

---

## Phase 7: User Story 5 - CI/CD pipeline verification (Priority: P2)

**Goal**: Parse workflow to ensure required validation/build/deploy steps exist.

**Independent Test**: Execute `node audit/index.js --target ci`; validate workflow checks summary in report.

### Implementation Tasks — US5

- [ ] T023 [US5] Implement CI/CD audit script `audit/scripts/ci_cd_audit.js`
- [ ] T024 [P] [US5] Implement workflow parser utility `audit/scripts/util/workflowParser.js`
- [ ] T025 [US5] Integrate CI/CD audit results into aggregator `audit/index.js`

**Checkpoint**: CI/CD verification independently runnable.

---

## Phase 8: User Story 6 - Documentation accuracy and drift check (Priority: P3)

**Goal**: Detect mismatches between docs and actual paths/configs.

**Independent Test**: Execute `node audit/index.js --target docs`; verify mismatches list populated or empty.

### Implementation Tasks — US6

- [ ] T026 [US6] Implement docs drift audit script `audit/scripts/docs_drift_audit.js`
- [ ] T027 [P] [US6] Implement docs path extractor `audit/scripts/util/docsExtractor.js`
- [ ] T028 [US6] Integrate docs drift audit results into aggregator `audit/index.js`

**Checkpoint**: Documentation drift verification independently runnable.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final report generation, documentation, consolidation, governance checks.

- [ ] T029 [P] Generate combined audit JSON report `audit/report/audit-report.json`
- [ ] T030 [P] Generate markdown summary `audit/report/audit-report.md`
- [ ] T031 Optimize and refactor shared helpers `audit/scripts/util/`
- [ ] T032 Update root usage guide with audit instructions `README.md`
- [ ] T033 Run quickstart validation steps `specs/001-project-audit-optimization/quickstart.md`
- [ ] T034 Perform constitution gate re-check log `audit/report/constitution-check.txt`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup → Foundational → Stories (US1–US6) → Polish
- Foundational blocks all story phases.
- US1, US2, US3 (P1) may begin together after Foundational if capacity allows.
- US4 & US5 (P2) start after P1 stories or in parallel if their prerequisites are met.
- US6 (P3) can start anytime after Foundational (depends minimally) but prioritized last.

### User Story Independence

- US1, US2, US3: Independent (different audit scripts & helpers).
- US4 depends on KV helper (Foundational only).
- US5 depends on workflow parser utility (created in its own phase).
- US6 depends only on docs extractor utility (its own phase).

### Internal Ordering per Story

1. Script implementation
2. Auxiliary utilities ([P] tasks)
3. Aggregator integration
4. Independent validation run

### Parallel Opportunities

- Phase 1: T003, T004 parallel after T001 & T002
- Phase 2: T006, T007, T008 can run in parallel; T010 after schema file read
- Story phases: All [P] tasks within a story can run once its primary script task is underway
- Multi-story parallel: US1, US2, US3 concurrently after Phase 2

### Parallel Examples Per Story

US2 Parallel Example:

```text
T015 (snapshot collector) runs while T014 (SSR audit script core) is implemented.
```

US3 Parallel Example:

```text
T018 (Astro example page) can be built while T017 (JSON:API audit script) is coded.
```

US6 Parallel Example:

```text
T027 (docs extractor utility) can run in parallel with T026 (drift audit logic).
```

---

## Implementation Strategy

### MVP Scope (Minimum Viable Audit)

- Complete Phases 1–2
- Implement US1 only (Tasks T011–T013)
- Generate initial report skeleton (partial JSON) via aggregator

### Incremental Delivery

1. MVP (US1) → Validate & commit report
2. Add US2 & US3 (SSR + API) → Expand report categories
3. Add US4 & US5 (KV + CI/CD) → Operational layer coverage
4. Add US6 (Docs drift) → Completeness pass
5. Polish phase: consolidate outputs & governance re-check

### Governance Alignment

- Constitution gate re-check (T034) ensures no drift in principles.
- All audit logic isolated under `audit/` (non-invasive).

### Risk Mitigation

- Non-invasive read-only audits (except KV write/read transient test key).
- Schema validation before report emission prevents malformed output.

---

## Notes

- No automated test tasks included (manual validation per D1)
- Each story produces distinct report section, enabling early partial delivery
- Tasks flagged [P] are safe to parallelize (different files)
- Aggregator modifications (index.js) sequenced to avoid merge conflicts

---

