# Audit Toolkit

This package houses developer tooling for validating the Drupal + Astro + Cloudflare starter kit without mutating project state.

## Installation

From the repository root run:

```bash
cd audit
npm install
```

> The toolkit is marked `private` and is scoped to local auditing only.

## Usage

Each audit target maps to a dedicated script that emits findings aligned with the schema in `../specs/001-project-audit-optimization/contracts/audit-report.schema.json`.

```bash
# Validate setup automation outputs and dev environment reachability
npm run audit:setup

# Compare Astro SSR parity between dev server and Workers
npm run audit:ssr

# Verify Drupal JSON:API integration
npm run audit:api

# Exercise the Cloudflare SESSION KV binding
npm run audit:kv

# Inspect CI/CD workflow definitions
npm run audit:ci

# Detect doc drift against actual project structure
npm run audit:docs

# Execute every audit target sequentially
npm run audit:all
```

Each invocation ultimately runs `node ./index.js --target <target>` with structured JSON output. The generated report will conform to the JSON schema referenced above, ensuring findings, recommendations, and gate results remain consistent with the feature contracts.
