#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {
  AUDIT_TARGETS,
  REPORT_DIR,
  JSON_SCHEMA_PATHS,
  REPORT_FILENAMES,
  FINDING_CATEGORIES
} from './scripts/util/constants.js';
import { validateAgainstSchema } from './scripts/util/schemaValidate.js';

const COLLECTOR_MODULES = {
  [AUDIT_TARGETS.SETUP]: './scripts/setup_audit.js',
  [AUDIT_TARGETS.API]: './scripts/jsonapi_audit.js',
  [AUDIT_TARGETS.STATIC]: './scripts/static_config_audit.js',
  [AUDIT_TARGETS.PAGES]: './scripts/pages_config_audit.js',
  [AUDIT_TARGETS.BUILD]: './scripts/build_contract_audit.js',
  [AUDIT_TARGETS.CI]: './scripts/ci_cd_audit.js',
  [AUDIT_TARGETS.DOCS]: './scripts/docs_drift_audit.js'
};

const normalizeTargets = (target) => {
  if (!target || target === AUDIT_TARGETS.ALL) {
    return Object.keys(COLLECTOR_MODULES);
  }

  if (!Object.prototype.hasOwnProperty.call(COLLECTOR_MODULES, target)) {
    throw new Error(`Unknown audit target: ${target}`);
  }

  return [target];
};

const loadCollector = async (target) => {
  const modulePath = COLLECTOR_MODULES[target];
  try {
    const module = await import(modulePath);
    const runner = module.run ?? module.default;

    if (typeof runner !== 'function') {
      throw new Error(`Collector module for ${target} does not export a run() function`);
    }

    return runner;
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error(`Collector for target "${target}" is not implemented yet.`);
    }

    throw error;
  }
};

const ensureReportDir = async () => {
  await fs.mkdir(REPORT_DIR, { recursive: true });
};

const mergeReport = (report, collectorResult = {}) => {
  const {
    findings = [],
    recommendations = [],
    gateResults = [],
    diagnostics = [],
    metadata
  } = collectorResult;

  if (Array.isArray(findings)) {
    report.findings.push(...findings);
  }

  if (Array.isArray(recommendations)) {
    report.recommendations.push(...recommendations);
  }

  if (Array.isArray(gateResults)) {
    report.gateResults.push(...gateResults);
  }

  if (Array.isArray(diagnostics)) {
    report.diagnostics.push(
      ...diagnostics.map((diag) => ({ ...diag, target: diag.target ?? collectorResult.target }))
    );
  }

  if (metadata) {
    report.metadata.collectors.push(metadata);
  }
};

const writeJsonReport = async (report) => {
  const jsonPath = path.join(REPORT_DIR, REPORT_FILENAMES.JSON);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return jsonPath;
};

const logSummary = (report) => {
  const categoryCounts = report.findings.reduce((acc, finding) => {
    const category = FINDING_CATEGORIES.includes(finding.category)
      ? finding.category
      : 'unknown';
    acc[category] = (acc[category] ?? 0) + 1;
    return acc;
  }, {});

  const totalFindings = report.findings.length;
  const totalRecommendations = report.recommendations.length;

  console.log(chalk.bold(`\nAudit results`));
  console.log(`  Findings: ${totalFindings}`);
  console.log(`  Recommendations: ${totalRecommendations}`);

  if (Object.keys(categoryCounts).length > 0) {
    console.log('  Findings by category:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`    • ${category}: ${count}`);
    });
  }

  if (report.diagnostics.length > 0) {
    console.log('\nDiagnostics:');
    report.diagnostics.forEach((diag) => {
      const level = diag.level?.toUpperCase() ?? 'INFO';
      console.log(`  [${level}] ${diag.message}`);
    });
  }
};

const run = async () => {
  const argv = yargs(hideBin(process.argv))
    .option('target', {
      alias: 't',
      choices: [...Object.keys(COLLECTOR_MODULES), AUDIT_TARGETS.ALL],
      default: AUDIT_TARGETS.ALL,
      describe: 'Audit target to execute'
    })
    .option('skip-write', {
      type: 'boolean',
      default: false,
      describe: 'Skip writing reports to disk'
    })
    .strict()
    .help(false)
    .alias('h', 'help')
    .parse();

  const targets = normalizeTargets(argv.target);
  const report = {
    generatedAt: new Date().toISOString(),
    findings: [],
    recommendations: [],
    gateResults: [],
    diagnostics: [],
    metadata: {
      issuedBy: 'audit/index.js',
      ranTargets: targets,
      collectors: []
    }
  };

  let hasErrors = false;

  for (const target of targets) {
    console.log(chalk.cyan(`Running audit target: ${target}`));
    const collectorMetadata = { target };

    try {
      const runCollector = await loadCollector(target);
      const collectorResult = await runCollector({ target });
      collectorMetadata.status = 'ok';
      collectorMetadata.findingCount = collectorResult?.findings?.length ?? 0;
      collectorMetadata.recommendationCount = collectorResult?.recommendations?.length ?? 0;
      mergeReport(report, { ...collectorResult, target });
    } catch (error) {
      hasErrors = true;
      collectorMetadata.status = 'error';
      collectorMetadata.error = error.message;
      console.error(chalk.red(`  ✖ ${error.message}`));
      mergeReport(report, {
        target,
        diagnostics: [
          {
            level: 'error',
            message: error.message
          }
        ]
      });
    } finally {
      report.metadata.collectors.push(collectorMetadata);
    }
  }

  const validation = await validateAgainstSchema(report, JSON_SCHEMA_PATHS.AUDIT_REPORT);

  if (!validation.valid) {
    hasErrors = true;
    console.error(chalk.red('\nSchema validation failed:'));
    validation.errors.forEach((error) => {
      console.error(`  • ${error.instancePath}: ${error.message} (${error.keyword})`);
    });
  }

  if (!argv['skip-write']) {
    await ensureReportDir();
    const jsonPath = await writeJsonReport(report);
    console.log(chalk.green(`\nReport written to ${path.relative(process.cwd(), jsonPath)}`));
  }

  logSummary(report);

  if (hasErrors) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error(chalk.red(`Unexpected audit failure: ${error.message}`));
  process.exitCode = 1;
});
