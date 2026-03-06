# Audit Toolkit

This package houses developer tooling for validating the Drupal + Astro + Cloudflare Pages starter kit without mutating project state.

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

# Verify Drupal JSON:API integration
npm run audit:api

# Verify Astro static-first configuration
npm run audit:static

# Validate Cloudflare Pages deployment config
npm run audit:pages

# Check build contracts and template patterns
npm run audit:build

# Inspect CI/CD workflow definitions
npm run audit:ci

# Detect doc drift against actual project structure
npm run audit:docs

# Execute every audit target sequentially
npm run audit:all
```

Each invocation ultimately runs `node ./index.js --target <target>` with structured JSON output. The generated report will conform to the JSON schema referenced above, ensuring findings, recommendations, and gate results remain consistent with the feature contracts.
