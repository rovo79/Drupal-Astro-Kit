# Testing Patterns

**Analysis Date:** 2026-03-11

## Test Framework

**Runner:**
- No unit test framework (no jest, vitest, mocha, or similar)
- `setup/package.json` has placeholder: `"test": "echo \"Error: no test specified\" && exit 1"`
- Validation is performed by the **audit toolkit** (`audit/`) — a custom non-mutating inspection suite

**Assertion Library:**
- None. Audit scripts produce structured findings (pass/fail with severity) rather than using assertion-based testing

**Run Commands:**
```bash
cd audit && npm run audit:all       # Run all 7 audit targets
cd audit && npm run audit:setup     # Setup configuration audit
cd audit && npm run audit:api       # JSON:API connectivity audit
cd audit && npm run audit:static    # Static config audit
cd audit && npm run audit:pages     # Pages/deployment config audit
cd audit && npm run audit:build     # Build contract audit
cd audit && npm run audit:ci        # CI/CD config audit
cd audit && npm run audit:docs      # Documentation drift audit
```

## Test File Organization

**Location:**
- All audit scripts live in `audit/scripts/` — not co-located with source
- Utilities shared across audits in `audit/scripts/util/`

**Naming:**
- Audit collectors: `{target}_audit.js` — e.g., `setup_audit.js`, `jsonapi_audit.js`
- Shared utilities: `camelCase.js` — e.g., `jsonapiClient.js`, `schemaValidate.js`
- Prerequisite checker: `check_env.js`

**Structure:**
```
audit/
├── index.js                          # Orchestrator — parses args, runs collectors, produces report
├── package.json                      # Dependencies: ajv, chalk, js-yaml, jsona, yargs
├── schemas/
│   └── audit-report.schema.json      # JSON Schema for report validation
└── scripts/
    ├── check_env.js                  # Shared prerequisite checker (DDEV, Node, etc.)
    ├── setup_audit.js                # Validates setup.sh / ui.js config
    ├── jsonapi_audit.js              # Tests JSON:API endpoint connectivity
    ├── static_config_audit.js        # Checks Astro static config
    ├── build_contract_audit.js       # Verifies build output contract
    ├── pages_config_audit.js         # Checks Cloudflare Pages config
    ├── ci_cd_audit.js                # Validates GitHub Actions workflows
    ├── docs_drift_audit.js           # Detects documentation drift
    ├── generate-report.js            # HTML/JSON report generator
    └── util/
        ├── constants.js              # Shared constants (paths, severity, categories)
        ├── jsonapiClient.js          # JSON:API client factory
        ├── schemaValidate.js         # Ajv schema validation wrapper
        ├── workflowParser.js         # GitHub Actions YAML parser
        └── docsExtractor.js          # Markdown documentation extractor
```

## Audit Architecture (How "Tests" Work)

**Suite Organization:**

Each audit collector follows this pattern:
```js
// audit/scripts/{target}_audit.js
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

function createFinding(title, severity, category, detail) {
  return {
    id: `finding-${crypto.randomUUID()}`,
    title, severity, category, detail,
  };
}

function createRecommendation(title, priority, effort, detail) {
  return {
    id: `rec-${crypto.randomUUID()}`,
    title, priority, effort, detail,
  };
}

export async function run(config) {
  const startTime = Date.now();
  const findings = [];
  const recommendations = [];
  const diagnostics = {};

  // --- Check 1: Verify something exists ---
  try {
    const content = await fs.readFile(somePath, 'utf8');
    // inspect content, push findings
    if (problem) {
      findings.push(createFinding(
        'Descriptive title',
        'medium',           // severity: info | low | medium | high
        'setup',            // category matching target
        'Detailed explanation of what was found'
      ));
    }
  } catch {
    findings.push(createFinding('File missing', 'high', 'setup', 'Required file not found'));
  }

  return {
    target: 'setup',
    findings,
    recommendations,
    diagnostics,
    metadata: {
      collectedAt: new Date().toISOString(),
      collectorVersion: '1.0.0',
      durationMs: Date.now() - startTime,
    },
  };
}

export default run;
```

**Orchestrator Pattern (`audit/index.js`):**
```js
// Simplified flow:
// 1. Parse CLI args (yargs) to select targets
// 2. Run prerequisite checks (check_env.js)
// 3. Import and execute each target's run(config) function
// 4. Collect all results into a unified report
// 5. Validate report against JSON schema (audit-report.schema.json)
// 6. Compute gate results (setup gate, integration gate, deployment gate)
// 7. Output summary with pass/fail per gate
// 8. Exit with code 1 if any gate fails
```

## Schema Validation

**Framework:** Ajv (Another JSON Schema Validator)

**Pattern:**
```js
// audit/scripts/util/schemaValidate.js
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

export function validateReport(report, schema) {
  const validate = ajv.compile(schema);
  const valid = validate(report);
  return { valid, errors: validate.errors };
}
```

**Schema location:** `audit/schemas/audit-report.schema.json`

**What is validated:**
- Every audit collector's return value conforms to the report schema
- Required fields: `target`, `findings[]`, `recommendations[]`, `diagnostics`, `metadata`
- Finding severity must be one of: `info`, `low`, `medium`, `high`
- Metadata must include `collectedAt`, `collectorVersion`, `durationMs`

## Gate System (Pass/Fail)

**Three gates evaluated from audit results:**

| Gate | Targets Included | Purpose |
|------|-----------------|---------|
| Setup Gate | `setup` | Can the project bootstrap? |
| Integration Gate | `api`, `static`, `build` | Does Drupal ↔ Astro integration work? |
| Deployment Gate | `pages`, `ci` | Is deployment config correct? |

**Gate logic:**
- A gate **fails** if any finding with severity `high` exists in its targets
- `docs` audit is informational only — not gated

**Exit behavior:**
- `audit/index.js` exits with code `1` if any gate fails
- Exit code `0` means all gates passed

## Mocking

**Framework:** None

**Approach:**
- Audits are **non-mutating inspections** of the actual filesystem and running services
- No mocks, stubs, or fakes — audits check real state
- JSON:API audit (`jsonapi_audit.js`) makes real HTTP requests to the DDEV Drupal instance
- File-based audits read actual project files

**What this means:**
- Audits require a bootstrapped project to run against (run `./setup.sh` first)
- API audits require DDEV to be running (`ddev start`)
- Build audit requires a successful Astro build (`npm run build` in `astro-frontend/`)

## Fixtures and Factories

**Test Data:**
- No fixture files or test data factories
- Audits inspect whatever state exists in the generated project
- `createFinding()` and `createRecommendation()` are factory functions for audit output (not test fixtures)

**Factory duplication note:**
- `createFinding()` and `createRecommendation()` are copy-pasted into every audit script
- These are NOT centralized in `audit/scripts/util/` — this is a known DRY violation (see CONCERNS.md)

## Coverage

**Requirements:** None enforced — no coverage tooling exists

**What counts as "covered":**
- Each of the 7 audit targets inspects a specific aspect of the generated project
- Coverage is conceptual (does the audit check all important config?) not line-based

## Test Types

**Unit Tests:**
- Not used. No unit test framework installed.

**Integration Tests:**
- The `jsonapi_audit.js` collector acts as an integration test — it hits the live Drupal JSON:API endpoint and validates response shape
- Uses a custom `createJsonApiClient()` factory from `audit/scripts/util/jsonapiClient.js`

**E2E Tests:**
- Not used. No Playwright, Cypress, or similar.
- The closest equivalent is running `./setup.sh` end-to-end and then `audit:all`

**Validation flow (manual E2E):**
1. `./setup.sh` — generates `drupal-backend/` and `astro-frontend/`
2. `cd drupal-backend && ddev start` — start Drupal
3. `cd astro-frontend && npm run build` — build static site
4. `cd audit && npm run audit:all` — run all validation audits
5. Check gate results for pass/fail

## Common Patterns

**Safe file reading (repeated across audit scripts):**
```js
async function readFileSafe(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
```

**Finding creation (repeated across audit scripts):**
```js
function createFinding(title, severity, category, detail) {
  return {
    id: `finding-${crypto.randomUUID()}`,
    title,
    severity,
    category,
    detail,
  };
}
```

**Conditional check pattern:**
```js
// Check if a config file exists and has expected content
const content = await readFileSafe(configPath);
if (!content) {
  findings.push(createFinding('Config missing', 'high', target, `Expected ${configPath}`));
} else {
  // Parse and inspect content
  const config = JSON.parse(content);
  if (!config.expectedField) {
    findings.push(createFinding('Missing field', 'medium', target, 'Detail...'));
  }
}
```

**Timing pattern (every collector):**
```js
export async function run(config) {
  const startTime = Date.now();
  // ... all checks ...
  return {
    // ...
    metadata: {
      collectedAt: new Date().toISOString(),
      collectorVersion: '1.0.0',
      durationMs: Date.now() - startTime,
    },
  };
}
```

## Adding a New Audit Target

To add a new audit target (e.g., `performance`):

1. Create `audit/scripts/performance_audit.js` following the collector pattern above
2. Export `run(config)` returning the standard `{ target, findings, recommendations, diagnostics, metadata }` shape
3. Register the target in `audit/index.js` collector map
4. Add to `AUDIT_TARGETS` in `audit/scripts/util/constants.js`
5. Add npm script in `audit/package.json`: `"audit:performance": "node index.js --target performance"`
6. Assign to appropriate gate in `audit/index.js` gate definitions

---

*Testing analysis: 2026-03-11*
