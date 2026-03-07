import crypto from 'node:crypto';
import chalk from 'chalk';
import {
  AUDIT_TARGETS,
  FINDING_CATEGORIES,
  PROJECT_ROOT,
  resolveFromProjectRoot
} from './util/constants.js';
import { scanDocumentation } from './util/docsExtractor.js';
import { collectSetupPrerequisites } from './check_env.js';

const createId = (prefix) => `${prefix}-${crypto.randomUUID()}`;

const createFinding = ({
  category = FINDING_CATEGORIES[0],
  severity = 'medium',
  description,
  evidence,
  recommendationId = null
}) => ({
  id: createId('finding'),
  category,
  severity,
  description,
  evidence,
  ...(recommendationId ? { recommendationId } : {})
});

const createRecommendation = ({
  action,
  impact = 'DX',
  effort = 'low',
  status = 'proposed',
  relatedFindingIds = []
}) => ({
  id: createId('rec'),
  relatedFindingIds,
  action,
  impact,
  effort,
  status
});

/**
 * Audit documentation for drift from actual repository state
 * Detects path/file references that don't exist
 */
export const run = async ({ target = AUDIT_TARGETS.DOCS } = {}) => {
  const findings = [];
  const recommendations = [];
  const diagnostics = [];

  console.log(chalk.dim('  Checking prerequisites...'));

  // Verify repository structure
  let prereqsResult;
  try {
    prereqsResult = await collectSetupPrerequisites();

    if (!prereqsResult.paths) {
      findings.push(
        createFinding({
          category: 'docs',
          severity: 'high',
          description: 'Docs drift audit error: failed to inspect repository paths',
          evidence: 'Cannot verify documentation references'
        })
      );

      diagnostics.push({
        level: 'error',
        message: 'Skipping docs drift audit due to path inspection failure'
      });

      return {
        target,
        findings,
        recommendations,
        diagnostics,
        metadata: {
          target,
          docsAuditSkipped: true,
          reason: 'path_error'
        }
      };
    }
  } catch (error) {
    findings.push(
      createFinding({
        category: 'docs',
        severity: 'high',
        description: 'Docs drift audit error: failed to check prerequisites',
        evidence: error.message
      })
    );
    diagnostics.push({
      level: 'error',
      message: `Prerequisites check failed: ${error.message}`
    });
    return {
      target,
      findings,
      recommendations,
      diagnostics,
      metadata: { target, docsAuditSkipped: true, reason: 'error' }
    };
  }

  console.log(chalk.dim('  Scanning documentation...'));

  // Scan documentation directory
  const docsDir = resolveFromProjectRoot('docs');

  let docScan;
  try {
    docScan = await scanDocumentation(docsDir, PROJECT_ROOT);

    diagnostics.push({
      level: 'info',
      message: `Scanned ${docScan.filesScanned} documentation file(s)`
    });

    if (docScan.filesScanned === 0) {
      findings.push(
        createFinding({
          category: 'docs',
          severity: 'low',
          description: 'Docs drift audit: no documentation files found',
          evidence: `Directory ${docsDir} is empty or missing`
        })
      );

      diagnostics.push({
        level: 'warning',
        message: 'No markdown files to audit'
      });

      return {
        target,
        findings,
        recommendations,
        diagnostics,
        metadata: {
          target,
          filesScanned: 0,
          driftIssues: 0
        }
      };
    }
  } catch (error) {
    findings.push(
      createFinding({
        category: 'docs',
        severity: 'high',
        description: 'Docs drift audit error: failed to scan documentation',
        evidence: error.message
      })
    );

    diagnostics.push({
      level: 'error',
      message: `Documentation scan failed: ${error.message}`
    });

    return {
      target,
      findings,
      recommendations,
      diagnostics,
      metadata: { target, docsAuditSkipped: true, reason: 'scan_error' }
    };
  }

  console.log(chalk.dim('  Analyzing documentation references...'));

  // Analyze path verification results
  const { pathVerification } = docScan;
  let driftIssueCount = 0;

  if (pathVerification.missing.length > 0) {
    driftIssueCount += pathVerification.missing.length;

    const missingPaths = pathVerification.missing.map((m) => m.path).join(', ');
    findings.push(
      createFinding({
        category: 'docs',
        severity: 'medium',
        description: `Docs drift audit: ${pathVerification.missing.length} referenced path(s) not found in repository`,
        evidence: `Missing: ${missingPaths}`
      })
    );

    recommendations.push(
      createRecommendation({
        action: 'Update documentation to reference existing paths or create missing files/directories',
        impact: 'DX',
        effort: 'low',
        relatedFindingIds: findings.filter((f) => f.description.includes('not found')).map((f) => f.id)
      })
    );

    pathVerification.missing.forEach((missing) => {
      diagnostics.push({
        level: 'warn',
        message: `Broken reference in docs: ${missing.path}`
      });
    });
  }

  if (pathVerification.errors.length > 0) {
    driftIssueCount += pathVerification.errors.length;

    findings.push(
      createFinding({
        category: 'docs',
        severity: 'low',
        description: `Docs drift audit: ${pathVerification.errors.length} error(s) verifying paths`,
        evidence: pathVerification.errors.map((e) => e.path).join(', ')
      })
    );

    pathVerification.errors.forEach((err) => {
      diagnostics.push({
        level: 'debug',
        message: `Path verification error for ${err.path}: ${err.error}`
      });
    });
  }

  // Check for outdated configuration references
  const expectedConfigs = {
    'wrangler.jsonc': true,
    'astro.config.mjs': true,
    'package.json': true
  };

  Object.entries(expectedConfigs).forEach(([config, shouldExist]) => {
    const mentioned = Object.keys(docScan.allConfigs).includes(config);
    if (!mentioned && shouldExist) {
      findings.push(
        createFinding({
          category: 'docs',
          severity: 'low',
          description: `Docs drift audit: configuration file ${config} not mentioned in documentation`,
          evidence: 'Documentation may be incomplete'
        })
      );
    }
  });

  // Summary
  diagnostics.push({
    level: 'info',
    message: `Total unique paths referenced: ${docScan.allPaths.length}`
  });

  diagnostics.push({
    level: 'info',
    message: `Valid paths: ${pathVerification.valid.length}, Missing: ${pathVerification.missing.length}`
  });

  diagnostics.push({
    level: 'info',
    message: `Environment variables referenced: ${docScan.allEnvVars.length}`
  });

  if (driftIssueCount === 0 && pathVerification.valid.length > 0) {
    diagnostics.push({
      level: 'info',
      message: 'Docs drift gate PASS: All referenced paths exist and are current'
    });
  }

  return {
    target,
    findings,
    recommendations,
    diagnostics,
    metadata: {
      target,
      filesScanned: docScan.filesScanned,
      pathsReferenced: docScan.allPaths.length,
      validPaths: pathVerification.valid.length,
      missingPaths: pathVerification.missing.length,
      driftIssues: driftIssueCount,
      configsReferenced: Object.keys(docScan.allConfigs),
      environmentVariablesReferenced: docScan.allEnvVars.length,
      missingReferences: pathVerification.missing.map((m) => m.path)
    }
  };
};

export default run;
