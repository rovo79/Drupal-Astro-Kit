# Housekeeping Sprint: Static-First Infrastructure Alignment

## TL;DR

> **Quick Summary**: Align all supporting infrastructure (CI/CD, audit toolkit, env vars, docs) with the current static-first architecture. The project's V1 milestone is complete (3 feature specs done), but CI is ~70% broken, audit toolkit tests dead SSR/KV code, env vars overlap, and docs reference obsolete patterns.
> 
> **Deliverables**:
> - Rewritten CI/CD pipeline (static-only, no backend job)
> - Refreshed audit toolkit (SSR/KV deleted, 3 new static-first audits)
> - Consolidated env vars with deprecation notes
> - Legacy-bannered docs + accurate AI docs + updated AGENTS.md
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves + final verification
> **Critical Path**: Task 1 (env vars) → Task 5 (CI rewrite) → Task 12 (QA)

---

## Context

### Original Request
User asked to explore the codebase and identify where the project left off, then perform a full housekeeping sprint to align all infrastructure with the current static-first architecture.

### Interview Summary
**Key Discussions**:
- All 3 feature specs (001, 002, 003) are complete — V1 static-first milestone achieved
- CI pipeline ~70% broken: checks for `.env` (gitignored), `wrangler.toml` (doesn't exist at root), `npm test` (no tests), `VITE_` prefix (not Astro), backend job with SSH deploy (aspirational)
- Audit toolkit has 6 targets; SSR and KV are dead code targeting removed features
- Env vars have overlap: templates read `API_BASE_URL`/`DRUPAL_BASE_URL`/`HOMEPAGE_ALIAS`, but `.env.example` also defines `DRUPAL_API_URL`/`DRUPAL_JSONAPI_URL`, and CI uses `VITE_API_URL`
- Docs: 3 files need legacy banners, 8 AI docs need accuracy updates

**Research Findings**:
- `audit/scripts/util/constants.js` defines `AUDIT_TARGETS` enum and `FINDING_CATEGORIES` — both need updating
- `audit/index.js` `COLLECTOR_MODULES` map needs SSR/KV entries removed, static/pages/build added
- `.env.template` is a vestigial MCP artifact (4 lines) — should be noted/removed
- `collect_snapshots.js` is an SSR helper to delete with `ssr_parity_audit.js`
- `setup/ui.js` stamps env vars during setup — needs review if canonical names change
- CI Pages deploy action uses `directory: astro-frontend` but should be `astro-frontend/dist`

**Confirmed Decisions**:
- CI: Static-only (remove backend job entirely)
- Audits: Delete SSR/KV, create static-first replacements
- Env vars: Consolidate + deprecation notes (don't break existing .env files)
- Docs: Add "LEGACY / Phase 2" banners, keep files discoverable
- Tests: Agent QA only — no unit/integration tests

---

## Work Objectives

### Core Objective
Eliminate all drift between the project's actual static-first architecture and its supporting infrastructure (CI, audits, env vars, docs), so the tooling accurately validates and documents what the project actually does.

### Concrete Deliverables
- `.github/workflows/main.yml` — rewritten, static-only, working
- `audit/scripts/` — 3 dead scripts deleted, 3 new static-first scripts created
- `audit/scripts/util/` — 2 dead utils deleted, constants.js updated
- `audit/index.js` — aggregator updated for new targets
- `audit/package.json` — npm scripts updated
- `audit/README.md` — documentation updated
- `.env.example` — consolidated with clear sections and deprecation notes
- `docs/ssr-guide.md`, `docs/cloudflare-setup.md`, `docs/github-actions.md` — legacy banners added
- `docs/ai/*.md` — 8 files reviewed and updated for accuracy
- `AGENTS.md` — updated with housekeeping findings

### Definition of Done
- [ ] `node audit/index.js --target all` runs without errors (new targets work)
- [ ] CI workflow YAML is valid (actionlint or manual inspection)
- [ ] No references to `wrangler.toml`, `VITE_`, `KV`, or `SSR` in active code (only in legacy-bannered docs)
- [ ] `.env.example` has clear canonical names with deprecation notes
- [ ] All 3 legacy docs have prominent banners
- [ ] AI docs reflect current static-first reality

### Must Have
- Remove all dead SSR/KV audit code
- Fix CI pipeline to reflect static-first reality
- Canonical env var names with deprecation notes
- Legacy banners on SSR-era documentation
- Updated AGENTS.md

### Must NOT Have (Guardrails)
- **No template changes** (`templates/astro-src/`) — env var names used by templates stay as-is (`API_BASE_URL`, `DRUPAL_BASE_URL`, `HOMEPAGE_ALIAS`)
- **No setup flow changes** (`setup.sh`, `setup/cli.js`) — unless env var contract requires it
- **No new features** — this is cleanup, not feature work
- **No Phase 2 SSR implementation** — only document it as future
- **No deleting legacy docs** — only add banners
- **No breaking existing `.env` files** — add deprecation notes, don't rename in-use vars
- **No over-abstraction** — new audit scripts should be simple, single-purpose files matching existing patterns
- **No excessive comments/JSDoc** — match existing code style

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (no test framework in project)
- **Automated tests**: NO (Agent QA only, per user decision)
- **Framework**: None

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Audit scripts**: Use Bash — run `node audit/index.js --target <target>`, verify exit code and output
- **CI YAML**: Use Bash — validate YAML syntax, check for forbidden patterns
- **Env/Docs**: Use Bash (grep) — verify canonical names present, legacy banners present, forbidden patterns absent

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundational, no dependencies):
├── Task 1: Env var consolidation (.env.example) [quick]
├── Task 2: Delete dead audit files (SSR/KV scripts + utils) [quick]
├── Task 3: Update audit constants.js (AUDIT_TARGETS, FINDING_CATEGORIES) [quick]
├── Task 4: Add legacy banners to 3 docs [quick]

Wave 2 (After Wave 1 — depends on env vars + constants):
├── Task 5: Rewrite CI/CD pipeline [unspecified-high]
├── Task 6: Create static_config_audit.js [unspecified-high]
├── Task 7: Create pages_config_audit.js [unspecified-high]
├── Task 8: Create build_contract_audit.js [unspecified-high]

Wave 3 (After Wave 2 — integration + docs):
├── Task 9: Update audit aggregator (index.js + package.json + README) [quick]
├── Task 10: Update AI docs (docs/ai/*.md) [writing]
├── Task 11: Update AGENTS.md [quick]

Wave 4 (After Wave 3 — final verification):
├── Task 12: Run full audit suite and verify [unspecified-high]

Wave FINAL (After ALL tasks — independent review, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
├── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 5 → Task 9 → Task 12 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Wave 1, Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 5, 10 | 1 |
| 2 | — | 9 | 1 |
| 3 | — | 6, 7, 8, 9 | 1 |
| 4 | — | 10 | 1 |
| 5 | 1 | 12 | 2 |
| 6 | 3 | 9, 12 | 2 |
| 7 | 3 | 9, 12 | 2 |
| 8 | 3 | 9, 12 | 2 |
| 9 | 2, 3, 6, 7, 8 | 12 | 3 |
| 10 | 1, 4 | 12 | 3 |
| 11 | — | 12 | 3 |
| 12 | 5, 9, 10, 11 | F1-F4 | 4 |

### Agent Dispatch Summary

- **Wave 1**: **4 tasks** — T1→`quick`, T2→`quick`, T3→`quick`, T4→`quick`
- **Wave 2**: **4 tasks** — T5→`unspecified-high`, T6→`unspecified-high`, T7→`unspecified-high`, T8→`unspecified-high`
- **Wave 3**: **3 tasks** — T9→`quick`, T10→`writing`, T11→`quick`
- **Wave 4**: **1 task** — T12→`unspecified-high`
- **FINAL**: **4 tasks** — F1→`oracle`, F2→`unspecified-high`, F3→`unspecified-high`, F4→`deep`

---

## TODOs

- [x] 1. Consolidate Env Vars in `.env.example`

  **What to do**:
  - Rewrite `.env.example` (67 lines) with clear sections and canonical names
  - **Canonical names** (these are what templates actually read — DO NOT rename):
    - `API_BASE_URL` — Astro build-time base URL for Drupal (used in `templates/astro-src/lib/drupal.ts`)
    - `DRUPAL_BASE_URL` — Drupal site URL (used in templates and setup)
    - `HOMEPAGE_ALIAS` — alias to duplicate at `/` (used in `templates/astro-src/pages/index.astro`)
  - **Add deprecation notes** for overlapping vars:
    - `DRUPAL_API_URL` → add comment: `# DEPRECATED: Use DRUPAL_JSONAPI_URL instead`
    - `DRUPAL_JSONAPI_URL` → keep as canonical for JSON:API endpoint
  - **Remove irrelevant vars**: `WORKERS_DEV_URL` references (not used in static-first)
  - **Clean up sections**: Group into Project, Drupal, Astro, Cloudflare, Development Tools
  - Remove staging/production commented-out blocks (these are aspirational and misleading)
  - Remove `DDEV_HOST`, `DDEV_SSH_KEY` (not used by any script)
  - Keep `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_PROJECT_NAME`
  - Verify `setup/ui.js` stamps the right vars (read it, confirm no changes needed)

  **Must NOT do**:
  - Do NOT rename `API_BASE_URL`, `DRUPAL_BASE_URL`, or `HOMEPAGE_ALIAS` — templates depend on these exact names
  - Do NOT modify `setup/ui.js` unless a var it stamps is being removed
  - Do NOT touch `.env` files (gitignored, user-specific)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file edit with clear requirements, no complex logic
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `drupal-11-module-builder`: Not a Drupal module task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 5, 10
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `.env.example` — current 67-line file to rewrite (the source of truth for structure)
  - `setup/ui.js` — stamps env vars during setup; verify which vars it writes to confirm no breakage

  **API/Type References** (contracts to implement against):
  - `templates/astro-src/lib/drupal.ts` — reads `import.meta.env.API_BASE_URL` and `import.meta.env.DRUPAL_BASE_URL`
  - `templates/astro-src/pages/index.astro` — reads `import.meta.env.HOMEPAGE_ALIAS`
  - `templates/astro-src/pages/[...slug].astro` — may read env vars (check)

  **External References**:
  - None needed — this is a project-specific configuration file

  **WHY Each Reference Matters**:
  - `.env.example` is the file being rewritten — know its current structure
  - `setup/ui.js` must not break — it generates `.env` for new users
  - Template files define the canonical env var names that MUST NOT change

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Canonical env vars present
    Tool: Bash (grep)
    Preconditions: .env.example has been rewritten
    Steps:
      1. grep "API_BASE_URL=" .env.example
      2. grep "DRUPAL_BASE_URL=" .env.example
      3. grep "HOMEPAGE_ALIAS=" .env.example
      4. grep "DRUPAL_JSONAPI_URL=" .env.example
    Expected Result: All 4 grep commands return matches (exit 0)
    Failure Indicators: Any grep returns exit 1 (not found)
    Evidence: .sisyphus/evidence/task-1-canonical-vars.txt

  Scenario: Deprecated vars have deprecation comments
    Tool: Bash (grep)
    Preconditions: .env.example has been rewritten
    Steps:
      1. grep -A1 "DEPRECATED" .env.example — should show DRUPAL_API_URL with deprecation note
      2. grep "VITE_" .env.example — should return no matches (VITE_ vars removed)
      3. grep "WORKERS_DEV_URL" .env.example — should return no matches
      4. grep "DDEV_HOST" .env.example — should return no matches
      5. grep "DDEV_SSH_KEY" .env.example — should return no matches
    Expected Result: Step 1 finds deprecation note; Steps 2-5 find no matches
    Failure Indicators: VITE_, WORKERS_DEV_URL, DDEV_HOST, or DDEV_SSH_KEY still present
    Evidence: .sisyphus/evidence/task-1-deprecated-removed.txt

  Scenario: setup/ui.js compatibility check
    Tool: Bash (grep)
    Preconditions: setup/ui.js has NOT been modified
    Steps:
      1. grep "API_BASE_URL\|DRUPAL_BASE_URL\|HOMEPAGE_ALIAS\|DRUPAL_JSONAPI_URL\|PROJECT_NAME" setup/ui.js
      2. Verify all vars stamped by setup/ui.js still exist in .env.example
    Expected Result: All vars that setup/ui.js stamps are present in .env.example
    Failure Indicators: setup/ui.js stamps a var that was removed from .env.example
    Evidence: .sisyphus/evidence/task-1-setup-compat.txt
  ```

  **Evidence to Capture:**
  - [ ] task-1-canonical-vars.txt
  - [ ] task-1-deprecated-removed.txt
  - [ ] task-1-setup-compat.txt

  **Commit**: YES
  - Message: `chore(env): consolidate env vars with deprecation notes`
  - Files: `.env.example`
  - Pre-commit: `grep "API_BASE_URL=" .env.example`

- [x] 2. Delete Dead SSR/KV Audit Files

  **What to do**:
  - Delete these audit scripts (SSR/KV features no longer exist):
    - `audit/scripts/ssr_parity_audit.js` — SSR parity testing (SSR removed)
    - `audit/scripts/kv_audit.js` — KV binding testing (KV removed)
    - `audit/scripts/collect_snapshots.js` — SSR snapshot helper
  - Delete these utility files (only used by deleted scripts):
    - `audit/scripts/util/ssrFetch.js` — SSR fetch utility
    - `audit/scripts/util/kvTest.js` — KV test utility
  - **Before deleting**: verify no other scripts import these files (grep for import references)
  - Total: 5 files deleted

  **Must NOT do**:
  - Do NOT delete `audit/scripts/util/jsonapiClient.js` — still used by `jsonapi_audit.js`
  - Do NOT modify `audit/index.js` yet — that's Task 9
  - Do NOT modify `audit/scripts/util/constants.js` — that's Task 3

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: File deletion with pre-check grep — simple, mechanical task
  - **Skills**: []
  - **Skills Evaluated but Omitted**: None relevant

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Task 9
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References**:
  - `audit/scripts/ssr_parity_audit.js` — file to delete, currently 1 of 6 collector modules
  - `audit/scripts/kv_audit.js` — file to delete, currently 1 of 6 collector modules
  - `audit/scripts/collect_snapshots.js` — SSR helper, only imported by ssr_parity_audit.js
  - `audit/scripts/util/ssrFetch.js` — utility only used by SSR audit
  - `audit/scripts/util/kvTest.js` — utility only used by KV audit

  **API/Type References**:
  - `audit/index.js:17-24` — `COLLECTOR_MODULES` map references these files (will be updated in Task 9)

  **WHY Each Reference Matters**:
  - Need to confirm no other files import the deleted files before removing them
  - `COLLECTOR_MODULES` will have broken references after deletion — Task 9 fixes this

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Dead files successfully deleted
    Tool: Bash (ls)
    Preconditions: Files existed before this task
    Steps:
      1. ls audit/scripts/ssr_parity_audit.js 2>&1 — should fail
      2. ls audit/scripts/kv_audit.js 2>&1 — should fail
      3. ls audit/scripts/collect_snapshots.js 2>&1 — should fail
      4. ls audit/scripts/util/ssrFetch.js 2>&1 — should fail
      5. ls audit/scripts/util/kvTest.js 2>&1 — should fail
    Expected Result: All 5 ls commands return "No such file or directory"
    Failure Indicators: Any file still exists
    Evidence: .sisyphus/evidence/task-2-files-deleted.txt

  Scenario: No dangling imports to deleted files
    Tool: Bash (grep)
    Preconditions: Files deleted
    Steps:
      1. grep -r "ssr_parity_audit" audit/scripts/ — should find 0 matches
      2. grep -r "kv_audit" audit/scripts/ — should find 0 matches
      3. grep -r "collect_snapshots" audit/scripts/ — should find 0 matches
      4. grep -r "ssrFetch" audit/scripts/ — should find 0 matches
      5. grep -r "kvTest" audit/scripts/ — should find 0 matches
    Expected Result: All grep commands return exit 1 (no matches)
    Failure Indicators: Any remaining import reference to deleted files
    Evidence: .sisyphus/evidence/task-2-no-dangling-imports.txt
  ```

  **Evidence to Capture:**
  - [ ] task-2-files-deleted.txt
  - [ ] task-2-no-dangling-imports.txt

  **Commit**: YES
  - Message: `chore(audit): remove dead SSR/KV audit scripts and utilities`
  - Files: 5 deleted files
  - Pre-commit: `ls audit/scripts/ssr_parity_audit.js 2>&1 | grep "No such file"`

- [x] 3. Update Audit Constants (`constants.js`)

  **What to do**:
  - Edit `audit/scripts/util/constants.js`:
    - Update `AUDIT_TARGETS` — remove `SSR` and `KV`, add `STATIC`, `PAGES`, `BUILD`:
      ```js
      const AUDIT_TARGETS = Object.freeze({
        SETUP: 'setup',
        API: 'api',
        STATIC: 'static',
        PAGES: 'pages',
        BUILD: 'build',
        CI: 'ci',
        DOCS: 'docs',
        ALL: 'all'
      });
      ```
    - Update `FINDING_CATEGORIES` — remove `'ssr'` and `'kv'`, add `'static'`, `'pages'`, `'build'`:
      ```js
      const FINDING_CATEGORIES = Object.freeze([
        'setup',
        'api',
        'static',
        'pages',
        'build',
        'ci',
        'docs',
        'performance'
      ]);
      ```
    - Update `ENV_KEYS` — remove `WORKERS_DEV_URL`, keep rest as-is:
      ```js
      const ENV_KEYS = Object.freeze({
        PROJECT_NAME: 'PROJECT_NAME',
        DRUPAL_BASE_URL: 'DRUPAL_BASE_URL',
        DRUPAL_JSONAPI_URL: 'DRUPAL_JSONAPI_URL',
        ASTRO_DEV_URL: 'ASTRO_DEV_URL',
        CLOUDFLARE_ACCOUNT_ID: 'CLOUDFLARE_ACCOUNT_ID',
        CLOUDFLARE_API_TOKEN: 'CLOUDFLARE_API_TOKEN'
      });
      ```
  - Do NOT change any other exports (path constants, helpers, etc.)

  **Must NOT do**:
  - Do NOT rename existing exported constants that other files depend on
  - Do NOT change path resolution logic
  - Do NOT add new helper functions (keep it minimal)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, well-scoped edits to 3 constants
  - **Skills**: []
  - **Skills Evaluated but Omitted**: None relevant

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Tasks 6, 7, 8, 9
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References**:
  - `audit/scripts/util/constants.js:14-22` — current `AUDIT_TARGETS` definition to modify
  - `audit/scripts/util/constants.js:24-32` — current `FINDING_CATEGORIES` to modify
  - `audit/scripts/util/constants.js:40-48` — current `ENV_KEYS` to modify

  **API/Type References**:
  - `audit/index.js:9-14` — imports `AUDIT_TARGETS`, `FINDING_CATEGORIES` from constants
  - `audit/scripts/ci_cd_audit.js` — may import `AUDIT_TARGETS` (check)
  - `audit/scripts/setup_audit.js` — may import `ENV_KEYS` (check)

  **WHY Each Reference Matters**:
  - The exact enum values determine what `--target` values the CLI accepts
  - Other scripts import these constants — changes must be compatible
  - `ENV_KEYS` affects what `check_env.js` validates

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Constants updated correctly
    Tool: Bash (node)
    Preconditions: constants.js has been edited
    Steps:
      1. node -e "import('./audit/scripts/util/constants.js').then(m => console.log(JSON.stringify(m.AUDIT_TARGETS)))" — should parse without error
      2. Verify output contains: setup, api, static, pages, build, ci, docs, all
      3. Verify output does NOT contain: ssr, kv
      4. node -e "import('./audit/scripts/util/constants.js').then(m => console.log(JSON.stringify(m.FINDING_CATEGORIES)))"
      5. Verify output contains: static, pages, build
      6. Verify output does NOT contain: ssr, kv
    Expected Result: All assertions pass, module loads without error
    Failure Indicators: Import error, missing target, or presence of ssr/kv
    Evidence: .sisyphus/evidence/task-3-constants-updated.txt

  Scenario: No reference to removed targets in constants
    Tool: Bash (grep)
    Preconditions: constants.js edited
    Steps:
      1. grep -i "SSR\|'ssr'" audit/scripts/util/constants.js — should find 0 matches
      2. grep -i "KV\|'kv'" audit/scripts/util/constants.js — should find 0 matches
      3. grep "WORKERS_DEV_URL" audit/scripts/util/constants.js — should find 0 matches
    Expected Result: All grep commands return exit 1 (no matches)
    Failure Indicators: Any SSR/KV/WORKERS reference remains
    Evidence: .sisyphus/evidence/task-3-no-dead-refs.txt
  ```

  **Evidence to Capture:**
  - [ ] task-3-constants-updated.txt
  - [ ] task-3-no-dead-refs.txt

  **Commit**: YES
  - Message: `chore(audit): update AUDIT_TARGETS for static-first`
  - Files: `audit/scripts/util/constants.js`
  - Pre-commit: `node -e "import('./audit/scripts/util/constants.js').then(m => console.log('OK'))"`

- [x] 4. Add Legacy Banners to SSR-Era Docs

  **What to do**:
  - Add a prominent legacy banner to the TOP of each file (before the first `#` heading):
    - `docs/ssr-guide.md` — full SSR implementation guide
    - `docs/cloudflare-setup.md` — may reference Workers/KV patterns
    - `docs/github-actions.md` — references broken CI pipeline
  - Banner format:
    ```markdown
    > **⚠️ LEGACY — Phase 2 / SSR Era**
    >
    > This document describes the Workers SSR architecture that is **not part of the current
    > static-first V1 stack**. It is preserved for future Phase 2 reference.
    > For current architecture, see [`docs/architecture.md`](architecture.md) and
    > [`docs/deployment.md`](deployment.md).
    ```
  - For `docs/github-actions.md` specifically, add an additional note:
    ```markdown
    > **Note**: The CI/CD pipeline (`main.yml`) has been rewritten for static-only
    > deployment. See the current workflow for up-to-date information.
    ```
  - Do NOT modify any other content in these files

  **Must NOT do**:
  - Do NOT delete these files
  - Do NOT modify content below the banner
  - Do NOT add banners to `docs/phase-2-workers-ssr.md` (already correctly scoped as Phase 2)
  - Do NOT touch `docs/architecture.md`, `docs/deployment.md`, `docs/troubleshooting.md` (current/accurate)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Prepending text to 3 files — simple, repetitive task
  - **Skills**: []
  - **Skills Evaluated but Omitted**: None relevant

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Task 10
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References**:
  - `docs/ssr-guide.md` — SSR guide to banner; read first line to know where to insert
  - `docs/cloudflare-setup.md` — Cloudflare Workers setup to banner
  - `docs/github-actions.md` — CI/CD docs to banner (extra note about rewrite)
  - `docs/phase-2-workers-ssr.md` — example of correctly scoped Phase 2 doc (do NOT modify)

  **WHY Each Reference Matters**:
  - Need to read each file's opening lines to insert banner correctly (before first heading)
  - `phase-2-workers-ssr.md` is a reference for appropriate Phase 2 labeling

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Legacy banners present in all 3 files
    Tool: Bash (grep)
    Preconditions: Banners added
    Steps:
      1. grep "LEGACY" docs/ssr-guide.md — should match
      2. grep "LEGACY" docs/cloudflare-setup.md — should match
      3. grep "LEGACY" docs/github-actions.md — should match
      4. grep "Phase 2" docs/ssr-guide.md — should match
    Expected Result: All grep commands return matches
    Failure Indicators: Any file missing the LEGACY banner
    Evidence: .sisyphus/evidence/task-4-banners-present.txt

  Scenario: No banner on current docs
    Tool: Bash (grep)
    Preconditions: Only legacy docs bannered
    Steps:
      1. grep "LEGACY" docs/architecture.md 2>&1 — should NOT match
      2. grep "LEGACY" docs/deployment.md 2>&1 — should NOT match
      3. grep "LEGACY" docs/troubleshooting.md 2>&1 — should NOT match
      4. grep "LEGACY" docs/phase-2-workers-ssr.md 2>&1 — should NOT match
    Expected Result: All grep commands return exit 1 (no matches)
    Failure Indicators: Banner added to non-legacy doc
    Evidence: .sisyphus/evidence/task-4-no-wrong-banners.txt
  ```

  **Evidence to Capture:**
  - [ ] task-4-banners-present.txt
  - [ ] task-4-no-wrong-banners.txt

  **Commit**: YES
  - Message: `docs: add legacy banners to SSR-era documentation`
  - Files: `docs/ssr-guide.md`, `docs/cloudflare-setup.md`, `docs/github-actions.md`
  - Pre-commit: `grep "LEGACY" docs/ssr-guide.md`

- [x] 5. Rewrite CI/CD Pipeline for Static-Only

  **What to do**:
  - Rewrite `.github/workflows/main.yml` (currently 159 lines) to a simple static-only pipeline:
  - **Remove entirely**:
    - `validate` job (checks for `.env` in repo and `wrangler.toml` at root — both wrong)
    - `backend` job (lines 85-134 — DDEV+SSH deploy that doesn't work)
    - `notify` job (depends on removed backend job)
  - **Keep and fix the `frontend` job**:
    - Remove `needs: validate` (validate job is gone)
    - Remove `npm test` step (no test suite exists)
    - Fix env vars: change `VITE_API_URL` → `API_BASE_URL`, remove `VITE_ANALYTICS_ID`
    - Fix deploy directory: `directory: astro-frontend/dist` (currently `astro-frontend`)
    - Keep: checkout, setup-node, npm ci, npm run build, deploy to Pages
  - **Structure** (single job):
    ```yaml
    name: Deploy Static Frontend
    on:
      push:
        branches: [main]
      pull_request:
        branches: [main]
    env:
      PROJECT_NAME: ${{ github.event.repository.name }}
    jobs:
      deploy:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with:
              node-version: "20"
              cache: "npm"
              cache-dependency-path: "astro-frontend/package-lock.json"
          - run: cd astro-frontend && npm ci
          - run: cd astro-frontend && npm run build
            env:
              API_BASE_URL: ${{ secrets.API_BASE_URL }}
          - uses: cloudflare/pages-action@v1
            if: github.ref == 'refs/heads/main'
            with:
              apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
              accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
              projectName: ${{ env.PROJECT_NAME }}
              directory: astro-frontend/dist
              gitHubToken: ${{ secrets.GITHUB_TOKEN }}
    ```
  - Remove `staging` branch triggers (not used)
  - Remove `environment` matrix (single environment)

  **Must NOT do**:
  - Do NOT add `npm test` step (no test suite)
  - Do NOT add backend/DDEV jobs
  - Do NOT reference `VITE_` prefixed vars
  - Do NOT check for `.env` or `wrangler.toml` existence
  - Do NOT add complex environment matrices

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Full file rewrite with GitHub Actions YAML — needs careful syntax
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `cloudflare`: Not deploying Workers — just a Pages static deploy action

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8)
  - **Blocks**: Task 12
  - **Blocked By**: Task 1 (canonical env var names)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References**:
  - `.github/workflows/main.yml` — current 159-line file to rewrite entirely
  - `scripts/deploy-frontend.sh` — local deploy script that does the same flow (build + wrangler pages deploy)

  **API/Type References**:
  - `cloudflare/pages-action@v1` — GitHub Action for Pages deploy (already used in current workflow)
  - `actions/setup-node@v4` — Node.js setup action (already used)

  **External References**:
  - `https://github.com/cloudflare/pages-action` — Pages action docs (confirm `directory` parameter)

  **WHY Each Reference Matters**:
  - Current `main.yml` shows what's broken — the rewrite fixes each issue
  - `deploy-frontend.sh` shows the correct deploy flow (build → deploy dist/)
  - Pages action docs confirm the `directory` param should be the output dir, not project dir

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: CI YAML is valid and static-only
    Tool: Bash
    Preconditions: main.yml has been rewritten
    Steps:
      1. python3 -c "import yaml; yaml.safe_load(open('.github/workflows/main.yml'))" — should parse
      2. grep "VITE_" .github/workflows/main.yml — should find 0 matches
      3. grep "wrangler.toml" .github/workflows/main.yml — should find 0 matches
      4. grep "npm test" .github/workflows/main.yml — should find 0 matches
      5. grep "backend" .github/workflows/main.yml — should find 0 matches
      6. grep "ddev" .github/workflows/main.yml — should find 0 matches (case insensitive)
      7. grep "SSH" .github/workflows/main.yml — should find 0 matches
      8. grep "astro-frontend/dist" .github/workflows/main.yml — should match
      9. grep "API_BASE_URL" .github/workflows/main.yml — should match
    Expected Result: YAML parses, no forbidden patterns, correct patterns present
    Failure Indicators: YAML parse error, forbidden pattern found, or correct pattern missing
    Evidence: .sisyphus/evidence/task-5-ci-yaml-valid.txt

  Scenario: No staging branch references
    Tool: Bash (grep)
    Preconditions: main.yml rewritten
    Steps:
      1. grep "staging" .github/workflows/main.yml — should find 0 matches
      2. grep "ENVIRONMENT" .github/workflows/main.yml — should find 0 matches (no env matrix)
    Expected Result: No staging or environment matrix references
    Failure Indicators: Staging references remain
    Evidence: .sisyphus/evidence/task-5-no-staging.txt
  ```

  **Evidence to Capture:**
  - [ ] task-5-ci-yaml-valid.txt
  - [ ] task-5-no-staging.txt

  **Commit**: YES
  - Message: `ci: rewrite pipeline for static-only frontend`
  - Files: `.github/workflows/main.yml`
  - Pre-commit: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/main.yml'))"`

- [x] 6. Create `static_config_audit.js`

  **What to do**:
  - Create `audit/scripts/static_config_audit.js` — verifies Astro is configured for static output
  - **Checks to implement**:
    1. Read `astro-frontend/astro.config.mjs` (if it exists in generated output) — verify `output: 'static'` or absence of `output` (static is default)
    2. Verify no SSR adapter is installed — grep `astro-frontend/package.json` for `@astrojs/cloudflare`, `@astrojs/node`, etc.
    3. Check templates source: verify `templates/astro-src/` doesn't contain SSR patterns (no `export const prerender = false`, no `Astro.response`)
  - **Follow existing audit script pattern** — export a `run()` function that returns an array of findings
  - Each finding must have: `category: 'static'`, `severity`, `message`, `details`
  - Use the same imports/patterns as `audit/scripts/setup_audit.js` or `audit/scripts/ci_cd_audit.js`
  - Handle missing files gracefully (astro-frontend/ may not exist if setup hasn't run)

  **Must NOT do**:
  - Do NOT use `AUDIT_TARGETS.SSR` or any removed constants
  - Do NOT duplicate checks that belong in `pages_config_audit.js` or `build_contract_audit.js`
  - Do NOT modify generated files — only read them

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: New JS file creation following existing patterns — needs to read reference files and match style
  - **Skills**: []
  - **Skills Evaluated but Omitted**: None relevant

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 7, 8)
  - **Blocks**: Tasks 9, 12
  - **Blocked By**: Task 3 (needs updated AUDIT_TARGETS)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `audit/scripts/ci_cd_audit.js` — follow this script's structure: exports `run()`, returns findings array, uses fs/path for file reads, handles errors gracefully
  - `audit/scripts/setup_audit.js` — another reference for finding format and error handling patterns
  - `audit/scripts/util/constants.js` — import `AUDIT_TARGETS`, `FINDING_CATEGORIES`, path constants from here

  **API/Type References**:
  - Finding object shape: `{ category: 'static', severity: 'info'|'low'|'medium'|'high', message: string, details: string }`
  - `AUDIT_TARGETS.STATIC` — the new target constant (created in Task 3)

  **External References**:
  - Astro config docs: `output: 'static'` is the default — absence of the field also means static

  **WHY Each Reference Matters**:
  - `ci_cd_audit.js` shows the exact export signature and finding format the aggregator expects
  - `constants.js` provides the shared constants to import
  - Understanding that `output: 'static'` is Astro's default prevents false positives

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Script loads and exports run function
    Tool: Bash (node)
    Preconditions: static_config_audit.js created
    Steps:
      1. node -e "import('./audit/scripts/static_config_audit.js').then(m => { if (typeof m.run !== 'function') throw new Error('no run()'); console.log('OK') })"
    Expected Result: Prints "OK" — module exports run() function
    Failure Indicators: Import error or "no run()" thrown
    Evidence: .sisyphus/evidence/task-6-exports-run.txt

  Scenario: Script runs without crashing (even without astro-frontend/)
    Tool: Bash (node)
    Preconditions: static_config_audit.js created, astro-frontend/ may or may not exist
    Steps:
      1. node -e "import('./audit/scripts/static_config_audit.js').then(m => m.run()).then(findings => { console.log(JSON.stringify(findings)); if (!Array.isArray(findings)) throw new Error('not array') })"
    Expected Result: Returns an array (possibly with info-level finding about missing astro-frontend/)
    Failure Indicators: Throws error, returns non-array, or crashes
    Evidence: .sisyphus/evidence/task-6-runs-clean.txt
  ```

  **Evidence to Capture:**
  - [ ] task-6-exports-run.txt
  - [ ] task-6-runs-clean.txt

  **Commit**: YES (grouped with Tasks 7, 8)
  - Message: `feat(audit): add static-first audit scripts`
  - Files: `audit/scripts/static_config_audit.js`, `audit/scripts/pages_config_audit.js`, `audit/scripts/build_contract_audit.js`
  - Pre-commit: `node -e "import('./audit/scripts/static_config_audit.js').then(m => console.log('OK'))"`

- [x] 7. Create `pages_config_audit.js`

  **What to do**:
  - Create `audit/scripts/pages_config_audit.js` — verifies Cloudflare Pages configuration
  - **Checks to implement**:
    1. Verify `astro-frontend/wrangler.jsonc` exists (not `wrangler.toml` at project root)
    2. Read `wrangler.jsonc` — verify it has `pages_build_output_dir` or equivalent Pages config
    3. Verify `scripts/deploy-frontend.sh` references correct deploy directory (`dist/`)
    4. Check that no `wrangler.toml` exists at project root (legacy artifact)
    5. Verify `astro-frontend/package.json` has correct build script
  - **Follow existing audit pattern** — same as Task 6
  - Use `category: 'pages'` for all findings
  - Handle missing files gracefully

  **Must NOT do**:
  - Do NOT check SSR adapter config (that's static_config_audit.js)
  - Do NOT modify any config files — read-only audit

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: New JS file creation following existing patterns
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `cloudflare`: Not configuring Workers — just checking wrangler.jsonc exists and is sane

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 8)
  - **Blocks**: Tasks 9, 12
  - **Blocked By**: Task 3 (needs updated AUDIT_TARGETS)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References**:
  - `audit/scripts/ci_cd_audit.js` — follow this structure (same as Task 6)
  - `audit/scripts/setup_audit.js` — another reference for file-existence checking patterns
  - `scripts/deploy-frontend.sh` — shows correct deploy flow and directory references

  **API/Type References**:
  - `AUDIT_TARGETS.PAGES` — new constant from Task 3
  - Finding shape: `{ category: 'pages', severity, message, details }`

  **WHY Each Reference Matters**:
  - `deploy-frontend.sh` is the source of truth for how deploys actually work — the audit should verify alignment
  - `ci_cd_audit.js` provides the structural template to follow

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Script loads and exports run function
    Tool: Bash (node)
    Preconditions: pages_config_audit.js created
    Steps:
      1. node -e "import('./audit/scripts/pages_config_audit.js').then(m => { if (typeof m.run !== 'function') throw new Error('no run()'); console.log('OK') })"
    Expected Result: Prints "OK"
    Failure Indicators: Import error or missing run()
    Evidence: .sisyphus/evidence/task-7-exports-run.txt

  Scenario: Script runs without crashing
    Tool: Bash (node)
    Preconditions: pages_config_audit.js created
    Steps:
      1. node -e "import('./audit/scripts/pages_config_audit.js').then(m => m.run()).then(findings => { console.log(JSON.stringify(findings)); if (!Array.isArray(findings)) throw new Error('not array') })"
    Expected Result: Returns a findings array
    Failure Indicators: Throws error or returns non-array
    Evidence: .sisyphus/evidence/task-7-runs-clean.txt
  ```

  **Evidence to Capture:**
  - [ ] task-7-exports-run.txt
  - [ ] task-7-runs-clean.txt

  **Commit**: YES (grouped with Tasks 6, 8)
  - Message: `feat(audit): add static-first audit scripts`

- [x] 8. Create `build_contract_audit.js`

  **What to do**:
  - Create `audit/scripts/build_contract_audit.js` — verifies the JSON:API-at-build-time contract
  - **Checks to implement**:
    1. Verify `templates/astro-src/lib/drupal.ts` uses build-time patterns (`getStaticPaths`, not runtime fetch)
    2. Verify `templates/astro-src/pages/[...slug].astro` exports `getStaticPaths()`
    3. Verify `templates/astro-src/pages/index.astro` uses build-time data fetching
    4. Check that no template file uses `Astro.response`, `export const prerender = false`, or other SSR patterns
    5. Verify env vars used in templates match canonical names (`API_BASE_URL`, `DRUPAL_BASE_URL`, `HOMEPAGE_ALIAS`)
  - **Follow existing audit pattern** — same as Tasks 6, 7
  - Use `category: 'build'` for all findings
  - Handle missing template files gracefully
  - Note: template source files are in `templates/astro-src/`, NOT in `astro-frontend/src/`

  **Must NOT do**:
  - Do NOT check generated `astro-frontend/` files (they're gitignored)
  - Do NOT modify template files
  - Do NOT check Astro config (that's static_config_audit.js)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: New JS file creation following existing patterns, needs to understand template structure
  - **Skills**: []
  - **Skills Evaluated but Omitted**: None relevant

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7)
  - **Blocks**: Tasks 9, 12
  - **Blocked By**: Task 3 (needs updated AUDIT_TARGETS)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References**:
  - `audit/scripts/ci_cd_audit.js` — follow this structure
  - `templates/astro-src/lib/drupal.ts` — the API client to audit; verify it uses build-time patterns
  - `templates/astro-src/pages/index.astro` — homepage template; verify `getStaticPaths` or equivalent
  - `templates/astro-src/pages/[...slug].astro` — slug route template; verify `getStaticPaths()`

  **API/Type References**:
  - `AUDIT_TARGETS.BUILD` — new constant from Task 3
  - Finding shape: `{ category: 'build', severity, message, details }`
  - AGENTS.md shell note: quote paths with `[...slug].astro` to avoid zsh glob expansion

  **WHY Each Reference Matters**:
  - Template files are the source of truth for how Astro consumes Drupal — the audit validates this contract
  - `drupal.ts` is the API layer — verify it's build-time only
  - The zsh glob note prevents the agent from causing shell errors when referencing `[...slug].astro`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Script loads and exports run function
    Tool: Bash (node)
    Preconditions: build_contract_audit.js created
    Steps:
      1. node -e "import('./audit/scripts/build_contract_audit.js').then(m => { if (typeof m.run !== 'function') throw new Error('no run()'); console.log('OK') })"
    Expected Result: Prints "OK"
    Failure Indicators: Import error or missing run()
    Evidence: .sisyphus/evidence/task-8-exports-run.txt

  Scenario: Script runs and checks template files
    Tool: Bash (node)
    Preconditions: build_contract_audit.js created, templates/astro-src/ exists
    Steps:
      1. node -e "import('./audit/scripts/build_contract_audit.js').then(m => m.run()).then(findings => { console.log(JSON.stringify(findings, null, 2)); if (!Array.isArray(findings)) throw new Error('not array') })"
      2. Verify findings array contains entries with category 'build'
    Expected Result: Returns array with build-category findings
    Failure Indicators: Throws error, returns non-array, or wrong category
    Evidence: .sisyphus/evidence/task-8-runs-clean.txt
  ```

  **Evidence to Capture:**
  - [ ] task-8-exports-run.txt
  - [ ] task-8-runs-clean.txt

  **Commit**: YES (grouped with Tasks 6, 7)
  - Message: `feat(audit): add static-first audit scripts`

- [ ] 9. Update Audit Aggregator (`index.js`, `package.json`, `README.md`)

  **What to do**:
  - **Edit `audit/index.js`**:
    - Update `COLLECTOR_MODULES` map — remove SSR/KV entries, add static/pages/build:
      ```js
      const COLLECTOR_MODULES = {
        [AUDIT_TARGETS.SETUP]: './scripts/setup_audit.js',
        [AUDIT_TARGETS.API]: './scripts/jsonapi_audit.js',
        [AUDIT_TARGETS.STATIC]: './scripts/static_config_audit.js',
        [AUDIT_TARGETS.PAGES]: './scripts/pages_config_audit.js',
        [AUDIT_TARGETS.BUILD]: './scripts/build_contract_audit.js',
        [AUDIT_TARGETS.CI]: './scripts/ci_cd_audit.js',
        [AUDIT_TARGETS.DOCS]: './scripts/docs_drift_audit.js'
      };
      ```
    - No other changes to index.js needed (CLI parsing, report generation all generic)
  - **Edit `audit/package.json`**:
    - Remove: `"audit:ssr"` and `"audit:kv"` scripts
    - Add: `"audit:static"`, `"audit:pages"`, `"audit:build"` scripts
    - Keep: `"audit:setup"`, `"audit:api"`, `"audit:ci"`, `"audit:docs"`, `"audit:all"`
  - **Edit `audit/README.md`**:
    - Remove SSR and KV usage examples
    - Add static, pages, build usage examples
    - Update the description to reflect static-first toolkit
    - Keep the schema reference and general structure

  **Must NOT do**:
  - Do NOT change the CLI argument parsing logic (yargs setup)
  - Do NOT change report generation logic
  - Do NOT change schema validation
  - Do NOT modify the collector loading pattern (dynamic import)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Well-scoped edits to 3 files with clear before/after
  - **Skills**: []
  - **Skills Evaluated but Omitted**: None relevant

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11)
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 2, 3, 6, 7, 8

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References**:
  - `audit/index.js:17-24` — current `COLLECTOR_MODULES` map to update
  - `audit/package.json:10-17` — current npm scripts to update
  - `audit/README.md` — current documentation to update

  **API/Type References**:
  - `AUDIT_TARGETS` from `audit/scripts/util/constants.js` — the new enum values
  - New script files from Tasks 6-8 — the modules to wire in

  **WHY Each Reference Matters**:
  - `COLLECTOR_MODULES` is the routing table — must match both `AUDIT_TARGETS` and actual file paths
  - `package.json` scripts are the user-facing CLI commands
  - `README.md` is the developer documentation for the audit toolkit

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Aggregator loads all new targets
    Tool: Bash (node)
    Preconditions: index.js updated, all new scripts exist
    Steps:
      1. node audit/index.js --target static 2>&1 — should not crash
      2. node audit/index.js --target pages 2>&1 — should not crash
      3. node audit/index.js --target build 2>&1 — should not crash
      4. node audit/index.js --target all 2>&1 — should run all targets
    Expected Result: All commands execute without "Unknown audit target" or import errors
    Failure Indicators: Error about unknown target or module not found
    Evidence: .sisyphus/evidence/task-9-targets-work.txt

  Scenario: Dead targets rejected
    Tool: Bash (node)
    Preconditions: index.js updated
    Steps:
      1. node audit/index.js --target ssr 2>&1 — should error "Unknown audit target"
      2. node audit/index.js --target kv 2>&1 — should error "Unknown audit target"
    Expected Result: Both commands fail with descriptive error
    Failure Indicators: SSR or KV target still accepted
    Evidence: .sisyphus/evidence/task-9-dead-targets-rejected.txt

  Scenario: npm scripts work
    Tool: Bash (npm)
    Preconditions: package.json updated
    Steps:
      1. cd audit && npm run audit:static 2>&1 — should execute
      2. cd audit && npm run audit:pages 2>&1 — should execute
      3. cd audit && npm run audit:build 2>&1 — should execute
      4. cd audit && npm run audit:ssr 2>&1 — should fail (script removed)
    Expected Result: New scripts run, old scripts fail
    Failure Indicators: New scripts fail or old scripts still work
    Evidence: .sisyphus/evidence/task-9-npm-scripts.txt
  ```

  **Evidence to Capture:**
  - [ ] task-9-targets-work.txt
  - [ ] task-9-dead-targets-rejected.txt
  - [ ] task-9-npm-scripts.txt

  **Commit**: YES
  - Message: `chore(audit): wire new targets into aggregator`
  - Files: `audit/index.js`, `audit/package.json`, `audit/README.md`
  - Pre-commit: `node audit/index.js --target static`

- [ ] 10. Update AI Docs for Static-First Accuracy

  **What to do**:
  - Review and update all 8 files in `docs/ai/`:
    1. `docs/ai/CODEBASE_MAP.md` — verify file tree matches reality, remove SSR/KV references
    2. `docs/ai/ARCHITECTURE.md` — verify it describes static-first, not SSR
    3. `docs/ai/STACK.md` — verify tech stack lists are current (no Workers/KV)
    4. `docs/ai/DEPLOYMENT.md` — verify it describes Pages static deploy, not Workers
    5. `docs/ai/COMMANDS.md` — verify commands are current and accurate
    6. `docs/ai/HOTSPOTS.md` — verify hotspot files exist and descriptions match
    7. `docs/ai/CONVENTIONS.md` — verify conventions match current patterns
    8. `docs/ai/TESTING.md` — verify testing guidance matches reality (no test suite)
    9. `docs/ai/SECURITY_AND_RISKS.md` — verify risks listed are current
  - For each file:
    - Read it fully
    - Check every file path reference against reality
    - Check every command against actual scripts
    - Fix any references to `wrangler.toml` → `wrangler.jsonc`
    - Fix any references to SSR/Workers/KV that should be static/Pages
    - Update audit toolkit references (remove SSR/KV targets, add static/pages/build)
  - If a file is already accurate, make no changes (don't touch just to touch)

  **Must NOT do**:
  - Do NOT restructure files — just fix inaccuracies
  - Do NOT add excessive commentary about what changed
  - Do NOT create new AI docs files

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation review and update across 9 files — needs careful reading and precise edits
  - **Skills**: []
  - **Skills Evaluated but Omitted**: None relevant

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 11)
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 1 (env var names), 4 (knows which docs have banners)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References**:
  - `docs/ai/CODEBASE_MAP.md` — the primary AI doc, likely has most drift
  - `docs/ai/COMMANDS.md` — command reference, verify against actual scripts
  - All 9 `docs/ai/*.md` files — read each one fully

  **API/Type References**:
  - `.env.example` (after Task 1) — canonical env var names to use in docs
  - `audit/package.json` (after Task 9) — canonical audit commands to reference
  - `AGENTS.md` — current agent instructions (source of truth for conventions)

  **WHY Each Reference Matters**:
  - AI docs are read by agents working on this codebase — inaccuracies cause wrong assumptions
  - Each file needs to be read fully to find subtle drift (e.g., `wrangler.toml` mentioned once)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No SSR/KV/wrangler.toml references in AI docs
    Tool: Bash (grep)
    Preconditions: AI docs updated
    Steps:
      1. grep -r "wrangler.toml" docs/ai/ — should find 0 matches
      2. grep -r "KV binding\|SESSION KV\|KV store" docs/ai/ — should find 0 matches
      3. grep -r "SSR parity\|SSR adapter\|Workers SSR" docs/ai/ — should find 0 matches (unless in "Phase 2" context)
      4. grep -r "audit:ssr\|audit:kv" docs/ai/ — should find 0 matches
    Expected Result: No stale references to removed features
    Failure Indicators: Any match outside of Phase 2 future context
    Evidence: .sisyphus/evidence/task-10-no-stale-refs.txt

  Scenario: Key accurate references present
    Tool: Bash (grep)
    Preconditions: AI docs updated
    Steps:
      1. grep "wrangler.jsonc" docs/ai/ -l — should find matches (correct config name)
      2. grep "static" docs/ai/ARCHITECTURE.md — should describe static-first
      3. grep "audit:static\|audit:pages\|audit:build" docs/ai/ — should find new targets mentioned
    Expected Result: Correct references present
    Failure Indicators: Missing references to current architecture
    Evidence: .sisyphus/evidence/task-10-accurate-refs.txt
  ```

  **Evidence to Capture:**
  - [ ] task-10-no-stale-refs.txt
  - [ ] task-10-accurate-refs.txt

  **Commit**: YES
  - Message: `docs(ai): update AI docs for static-first accuracy`
  - Files: `docs/ai/*.md` (only files that needed changes)
  - Pre-commit: `grep -r "wrangler.toml" docs/ai/ ; echo "exit: $?"`

- [ ] 11. Update `AGENTS.md`

  **What to do**:
  - Update `AGENTS.md` (currently 58 lines) with findings from this housekeeping sprint:
  - **Add/update sections**:
    - Audit toolkit: update target list to `setup, api, static, pages, build, ci, docs`
    - Remove any SSR/KV references in commands or pointers
    - Add note about legacy docs having banners
    - Update "Common commands" if audit commands changed
    - Verify "Testing & validation" section matches reality
  - Keep the file concise — AGENTS.md is for agent instructions, not a full changelog

  **Must NOT do**:
  - Do NOT turn AGENTS.md into a changelog
  - Do NOT add excessive detail about the housekeeping sprint
  - Do NOT change golden rules or architecture description (already accurate)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single small file update with clear scope
  - **Skills**: []
  - **Skills Evaluated but Omitted**: None relevant

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10)
  - **Blocks**: Task 12
  - **Blocked By**: None (can reference confirmed decisions directly)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References**:
  - `AGENTS.md` — current 58-line file to update
  - `.github/copilot-instructions.md` — parallel agent instructions file (keep consistent)

  **WHY Each Reference Matters**:
  - `AGENTS.md` is the primary instruction file agents read
  - `copilot-instructions.md` has some overlapping info — verify consistency but don't modify it in this task

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: AGENTS.md reflects current audit targets
    Tool: Bash (grep)
    Preconditions: AGENTS.md updated
    Steps:
      1. grep "audit:ssr\|audit:kv" AGENTS.md — should find 0 matches
      2. grep "static\|pages\|build" AGENTS.md — should find matches for new targets
      3. grep "SSR" AGENTS.md — only in Phase 2/future context, not as current feature
    Expected Result: Current targets referenced, dead targets removed
    Failure Indicators: Old targets still referenced or new targets missing
    Evidence: .sisyphus/evidence/task-11-agents-updated.txt

  Scenario: Golden rules preserved
    Tool: Bash (grep)
    Preconditions: AGENTS.md updated
    Steps:
      1. grep "Do not commit secrets" AGENTS.md — should match
      2. grep "Static-first is the default" AGENTS.md — should match
      3. grep "Do not.*fix.*editing generated dirs" AGENTS.md — should match
    Expected Result: All golden rules still present
    Failure Indicators: Any golden rule accidentally removed
    Evidence: .sisyphus/evidence/task-11-golden-rules.txt
  ```

  **Evidence to Capture:**
  - [ ] task-11-agents-updated.txt
  - [ ] task-11-golden-rules.txt

  **Commit**: YES
  - Message: `docs: update AGENTS.md with housekeeping findings`
  - Files: `AGENTS.md`
  - Pre-commit: `grep "Static-first" AGENTS.md`

- [ ] 12. Run Full Audit Suite and Verify

  **What to do**:
  - Run the complete audit suite end-to-end as final integration verification:
    1. `cd audit && npm install` — ensure dependencies are current
    2. `node audit/index.js --target all` — run all targets, capture full output
    3. Verify each target completes without crash:
       - `--target setup` — should run (may have findings if DDEV not running)
       - `--target api` — should run (may have findings if DDEV not running)
       - `--target static` — should run and check Astro config
       - `--target pages` — should run and check wrangler.jsonc
       - `--target build` — should run and check template contract
       - `--target ci` — should run and check CI YAML
       - `--target docs` — should run and check doc drift
    4. Verify the report output conforms to the JSON schema
    5. Run grep checks for forbidden patterns across entire codebase:
       - No `wrangler.toml` references in active code (outside legacy-bannered docs)
       - No `VITE_` prefix in CI
       - No `ssr_parity` or `kv_audit` imports in audit/
       - No broken imports in any audit script

  **Must NOT do**:
  - Do NOT fix issues found — only report them (fixes would be scope creep)
  - Do NOT modify any files

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Integration verification across multiple components — needs thorough testing
  - **Skills**: []
  - **Skills Evaluated but Omitted**: None relevant

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential — runs after all other tasks)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 5, 9, 10, 11

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References**:
  - `audit/index.js` — aggregator (updated in Task 9)
  - `audit/package.json` — npm scripts (updated in Task 9)
  - `specs/001-project-audit-optimization/contracts/audit-report.schema.json` — report schema to validate against

  **WHY Each Reference Matters**:
  - `index.js` is the entry point being tested
  - Schema validation confirms output format is correct
  - This task is the integration test for all audit-related tasks (2, 3, 6, 7, 8, 9)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full audit suite completes
    Tool: Bash (node)
    Preconditions: All previous tasks complete
    Steps:
      1. cd audit && node index.js --target all 2>&1
      2. Check exit code is 0
      3. Verify output mentions all 7 targets: setup, api, static, pages, build, ci, docs
    Expected Result: Clean run with all targets completing
    Failure Indicators: Non-zero exit code, missing target, or import error
    Evidence: .sisyphus/evidence/task-12-full-suite.txt

  Scenario: No forbidden patterns in active code
    Tool: Bash (grep)
    Preconditions: All tasks complete
    Steps:
      1. grep -r "wrangler\.toml" .github/ audit/ templates/ setup/ — should find 0 matches
      2. grep -r "VITE_" .github/ — should find 0 matches
      3. grep -r "ssr_parity\|kv_audit\|collect_snapshots" audit/ — should find 0 matches
      4. grep -r "ssrFetch\|kvTest" audit/ — should find 0 matches
    Expected Result: Zero forbidden pattern matches
    Failure Indicators: Any match found
    Evidence: .sisyphus/evidence/task-12-no-forbidden-patterns.txt

  Scenario: Individual targets all work
    Tool: Bash (node)
    Preconditions: All tasks complete
    Steps:
      1. node audit/index.js --target static 2>&1 — capture output
      2. node audit/index.js --target pages 2>&1 — capture output
      3. node audit/index.js --target build 2>&1 — capture output
      4. All should exit cleanly (exit 0)
    Expected Result: Each new target produces findings array without error
    Failure Indicators: Any target crashes or produces invalid output
    Evidence: .sisyphus/evidence/task-12-individual-targets.txt
  ```

  **Evidence to Capture:**
  - [ ] task-12-full-suite.txt
  - [ ] task-12-no-forbidden-patterns.txt
  - [ ] task-12-individual-targets.txt

  **Commit**: NO (verification only — no file changes)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run linter checks on modified JS files. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names. Verify new audit scripts follow existing patterns (same exports, same error handling, same finding structure).
  Output: `Lint [PASS/FAIL] | Files [N clean/N issues] | Pattern Compliance [PASS/FAIL] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Run `node audit/index.js --target all` and verify all targets complete. Run each individual target (`--target static`, `--target pages`, `--target build`). Verify CI YAML parses correctly. Grep for forbidden patterns (`wrangler.toml` in active code, `VITE_` in CI, SSR/KV imports outside legacy docs). Check legacy banners are visible. Save evidence.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance: no template changes, no setup flow changes, no new features. Detect unaccounted changes. Flag scope creep.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `chore(env): consolidate env vars with deprecation notes` — `.env.example`
- **Wave 1**: `chore(audit): remove dead SSR/KV audit scripts and utilities` — deleted files
- **Wave 1**: `chore(audit): update AUDIT_TARGETS for static-first` — `constants.js`
- **Wave 1**: `docs: add legacy banners to SSR-era documentation` — 3 doc files
- **Wave 2**: `ci: rewrite pipeline for static-only frontend` — `main.yml`
- **Wave 2**: `feat(audit): add static-first audit scripts` — 3 new scripts
- **Wave 3**: `chore(audit): wire new targets into aggregator` — `index.js`, `package.json`, `README.md`
- **Wave 3**: `docs(ai): update AI docs for static-first accuracy` — `docs/ai/*.md`
- **Wave 3**: `docs: update AGENTS.md with housekeeping findings` — `AGENTS.md`
- **Wave 4**: No commit (verification only)

---

## Success Criteria

### Verification Commands
```bash
node audit/index.js --target all       # Expected: all targets pass, no SSR/KV targets
node audit/index.js --target static    # Expected: clean run, findings array
node audit/index.js --target pages     # Expected: clean run, findings array
node audit/index.js --target build     # Expected: clean run, findings array
grep -r "wrangler.toml" .github/       # Expected: no matches
grep -r "VITE_" .github/              # Expected: no matches
grep -r "ssr_parity" audit/           # Expected: no matches (dead code gone)
grep -r "kv_audit" audit/             # Expected: no matches (dead code gone)
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] `audit:all` runs without errors
- [ ] CI YAML is valid and references correct env vars
- [ ] Legacy docs have banners
- [ ] AI docs are accurate
- [ ] AGENTS.md reflects current state
