# Coding Conventions

**Analysis Date:** 2026-03-11

## Naming Patterns

**Files:**
- Audit scripts: `snake_case.js` — e.g., `audit/scripts/setup_audit.js`, `jsonapi_audit.js`, `static_config_audit.js`
- Utility modules: `camelCase.js` — e.g., `audit/scripts/util/jsonapiClient.js`, `docsExtractor.js`, `schemaValidate.js`
- Astro components/pages: `PascalCase.astro` for layouts (`Base.astro`), `kebab-or-slug.astro` for pages (`index.astro`, `[...slug].astro`)
- TypeScript library files: `camelCase.ts` — e.g., `templates/astro-src/lib/drupal.ts`
- Shell scripts: `kebab-case.sh` — e.g., `scripts/seed-content.sh`, `scripts/deploy-frontend.sh`

**Functions:**
- Use `camelCase` for all function names
- Factory functions prefixed with `create`: `createJsonApiClient()`, `createStepRunner()`, `createFinding()`, `createRecommendation()`
- Boolean-returning helpers prefixed with `is`/`has`/`check`: `pathExists()`, `checkPrereqs()`
- File-reading helpers use `Safe` suffix: `readFileSafe()`, `readJsonSafe()`

**Variables:**
- Local variables: `camelCase` — `projectName`, `siteName`, `baseUrl`
- Destructured imports: `camelCase` — `const { readFile, writeFile } = await import('node:fs/promises')`

**Constants:**
- Module-level constants: `UPPER_SNAKE_CASE` — `AUDIT_TARGETS`, `SEVERITY`, `CATEGORY`, `GATE`
- Frozen with `Object.freeze()` for enum-like constants (see `audit/scripts/util/constants.js`)
- Path constants: `UPPER_SNAKE_CASE` — `DRUPAL_DIR`, `ASTRO_DIR`, `ROOT_DIR`

**Types (TypeScript, templates only):**
- Interfaces: `PascalCase` — `DrupalNode`, `DrupalJsonApiResponse`, `JsonApiResource`
- No `I` prefix on interfaces

## Code Style

**Formatting:**
- No automated formatter configured (no `.prettierrc`, `.editorconfig`, or similar)
- Observed: 2-space indentation throughout JS/TS files
- Single quotes for JS strings; backtick template literals used liberally for interpolation
- Semicolons used consistently
- Trailing commas in multi-line arrays/objects

**Linting:**
- No linter configured (no `.eslintrc`, `biome.json`, or similar)
- Code quality enforced by convention only

## Module System

**ES Modules exclusively:**
- Both `setup/package.json` and `audit/package.json` declare `"type": "module"`
- All imports use `import` / `export` syntax — no `require()` anywhere
- Node built-ins always use `node:` prefix: `import fs from 'node:fs/promises'`, `import path from 'node:path'`, `import crypto from 'node:crypto'`

## Import Organization

**Order (observed pattern):**
1. Node built-ins with `node:` prefix — `import fs from 'node:fs/promises'`, `import path from 'node:path'`
2. Third-party packages — `import chalk from 'chalk'`, `import Ajv from 'ajv'`
3. Local/relative imports — `import { CONSTANTS } from './util/constants.js'`

**Path style:**
- Always include `.js` extension in relative imports (required for ESM): `import { run } from './setup_audit.js'`
- No path aliases configured

**Path Aliases:**
- None. All imports use relative paths with explicit `.js` extensions

## Export Style

**Named exports preferred:**
- Audit scripts export `run` as named: `export async function run(config) {}`
- Some audit scripts also add `export default run` as a convenience — this is inconsistent but harmless
- Utility modules export individual functions: `export function createJsonApiClient() {}`

**Barrel files:**
- Not used. Each module is imported individually

## Error Handling

**Patterns:**
- Wrap all I/O operations in `try/catch` with contextual error messages
- Use empty `catch {}` blocks (no binding) for optional/best-effort checks where failure is acceptable:
  ```js
  try { content = await fs.readFile(path, 'utf8'); } catch {}
  ```
- Helper pattern: `readFileSafe(path)` returns `null` on failure, `pathExists(path)` returns boolean — these are repeated across files (not centralized)
- Never throw raw errors; wrap with context: `throw new Error(\`Failed to read ${filePath}: ${err.message}\`)`
- In `setup/ui.js`: errors cancel the setup flow with user-friendly messages via `@clack/prompts`

**Exit codes:**
- Shell scripts use `exit 1` on fatal errors
- `setup.sh` uses `set -e` for fail-fast behavior
- Audit runner exits with code 1 if any gate fails

## Logging

**Framework:** No framework — direct `console.*` calls

**Patterns:**
- `setup/ui.js`: Uses `@clack/prompts` for structured CLI output (`intro()`, `outro()`, `spinner()`, `log.info()`, `log.warning()`, `log.error()`)
- `setup/ui.js`: Also uses `picocolors` for colored inline text (`pc.green()`, `pc.red()`, `pc.dim()`)
- Audit scripts: Use `chalk` for colored output (`chalk.green()`, `chalk.red()`, `chalk.yellow()`, `chalk.bold()`)
- Shell scripts: Use helper functions for colored output:
  ```bash
  print_status() { echo -e "\033[0;32m✓ $1\033[0m"; }
  print_error()  { echo -e "\033[0;31m✗ $1\033[0m"; }
  print_warning(){ echo -e "\033[0;33m⚠ $1\033[0m"; }
  ```

## ID Generation

**Pattern:** UUID-based with semantic prefix
- `crypto.randomUUID()` from Node built-in
- Prefixed format: `finding-${crypto.randomUUID()}`, `rec-${crypto.randomUUID()}`
- Used in audit findings and recommendations for traceability

## Comments

**When to Comment:**
- JSDoc-style block comments on public functions in TypeScript files (`templates/astro-src/lib/drupal.ts`)
- Inline `//` comments for non-obvious logic or configuration rationale
- Section-separator comments in large files (`setup/ui.js` uses `// ─── Section ───` style)

**JSDoc/TSDoc:**
- Used in `templates/astro-src/lib/drupal.ts` with `@param`, `@returns`, `@throws`
- Not used in JS files — functions are self-documenting via descriptive names

## Function Design

**Size:** 
- Most functions are 10–40 lines
- Exception: `setup/ui.js` has some orchestration functions reaching 100+ lines

**Parameters:**
- Config/options objects preferred over positional args: `async function run(config) {}`
- Destructuring in function body: `const { projectName, siteName } = config`

**Return Values:**
- Audit collectors always return the standard shape: `{ target, findings, recommendations, diagnostics, metadata }`
- Helper functions return `null` on failure (not `undefined`)
- Boolean helpers return explicit `true`/`false`

## Audit Report Contract

**Every audit collector must return:**
```js
{
  target: string,           // e.g., 'setup', 'api', 'static'
  findings: [
    {
      id: 'finding-UUID',
      title: string,
      severity: 'info' | 'low' | 'medium' | 'high',
      category: string,
      detail: string
    }
  ],
  recommendations: [
    {
      id: 'rec-UUID',
      title: string,
      priority: 'info' | 'low' | 'medium' | 'high',
      effort: 'low' | 'medium' | 'high',
      detail: string
    }
  ],
  diagnostics: {},          // target-specific raw data
  metadata: {
    collectedAt: ISO-string,
    collectorVersion: string,
    durationMs: number
  }
}
```
- Validated against JSON schema at `audit/schemas/audit-report.schema.json`

## Shell Script Conventions

**Shebang:** `#!/usr/bin/env bash`
**Safety:** Always `set -e` at top
**Color output:** Helper functions (`print_status`, `print_error`, `print_warning`) defined at top of each script
**Variable quoting:** Double-quote all variable expansions: `"${PROJECT_NAME}"`
**DDEV commands:** Prefixed with `ddev` — `ddev drush`, `ddev exec`

## Astro/Template Conventions

**Frontmatter:**
- TypeScript in frontmatter fence (`---`) at top of `.astro` files
- Imports, data fetching, and variable setup in frontmatter
- HTML template below the fence

**Data fetching:**
- All data fetched at build time via `getStaticPaths()` (static-first architecture)
- API client in `templates/astro-src/lib/drupal.ts` used for JSON:API calls
- Environment variables accessed via `import.meta.env.PUBLIC_DRUPAL_BASE_URL`

---

*Convention analysis: 2026-03-11*
