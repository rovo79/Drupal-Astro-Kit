import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Resolve important project locations relative to this module.
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const UTIL_DIR = CURRENT_DIR;
const SCRIPTS_DIR = path.resolve(UTIL_DIR, '..');
const AUDIT_ROOT = path.resolve(SCRIPTS_DIR, '..');
const PROJECT_ROOT = path.resolve(AUDIT_ROOT, '..');
const SPEC_ROOT = path.join(PROJECT_ROOT, 'specs', '001-project-audit-optimization');
const CONTRACTS_DIR = path.join(SPEC_ROOT, 'contracts');
const REPORT_DIR = path.join(AUDIT_ROOT, 'report');

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

const SEVERITY_LEVELS = Object.freeze(['info', 'low', 'medium', 'high']);

const VALIDATION_GATES = Object.freeze(['setup', 'integration', 'deployment']);

const DEFAULT_TIMEOUT_MS = 10000;

const ENV_KEYS = Object.freeze({
  PROJECT_NAME: 'PROJECT_NAME',
  DRUPAL_BASE_URL: 'DRUPAL_BASE_URL',
  DRUPAL_JSONAPI_URL: 'DRUPAL_JSONAPI_URL',
  ASTRO_DEV_URL: 'ASTRO_DEV_URL',
  CLOUDFLARE_ACCOUNT_ID: 'CLOUDFLARE_ACCOUNT_ID',
  CLOUDFLARE_API_TOKEN: 'CLOUDFLARE_API_TOKEN'
});

const JSON_SCHEMA_PATHS = Object.freeze({
  AUDIT_REPORT: path.join(CONTRACTS_DIR, 'audit-report.schema.json')
});

const REPORT_FILENAMES = Object.freeze({
  JSON: 'audit-report.json',
  MARKDOWN: 'audit-report.md',
  CONSTITUTION_LOG: 'constitution-check.txt'
});

const TIMESTAMP_FORMAT = 'iso8601';

const ensureTrailingSlash = (value) =>
  value.endsWith('/') ? value : `${value}/`;

const ensureLeadingSlash = (value) =>
  value.startsWith('/') ? value : `/${value}`;

const resolveFromProjectRoot = (...segments) => path.join(PROJECT_ROOT, ...segments);
const resolveFromAuditRoot = (...segments) => path.join(AUDIT_ROOT, ...segments);

export {
  PROJECT_ROOT,
  AUDIT_ROOT,
  SCRIPTS_DIR,
  SPEC_ROOT,
  CONTRACTS_DIR,
  REPORT_DIR,
  AUDIT_TARGETS,
  FINDING_CATEGORIES,
  SEVERITY_LEVELS,
  VALIDATION_GATES,
  DEFAULT_TIMEOUT_MS,
  ENV_KEYS,
  JSON_SCHEMA_PATHS,
  REPORT_FILENAMES,
  TIMESTAMP_FORMAT,
  ensureTrailingSlash,
  ensureLeadingSlash,
  resolveFromProjectRoot,
  resolveFromAuditRoot
};
