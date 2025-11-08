import crypto from 'node:crypto';
import chalk from 'chalk';
import {
  AUDIT_TARGETS,
  FINDING_CATEGORIES,
  ENV_KEYS,
  resolveFromProjectRoot
} from './util/constants.js';
import { timedFetch, compareResponses } from './util/ssrFetch.js';
import { collectSetupPrerequisites, deriveExpectedHosts } from './check_env.js';
import { collectSnapshots } from './collect_snapshots.js';

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
 * Audit SSR parity between Astro dev and Workers dev
 * Fetches snapshots from both environments and compares rendering behavior
 */
export const run = async ({ target = AUDIT_TARGETS.SSR } = {}) => {
  const findings = [];
  const recommendations = [];
  const diagnostics = [];

  console.log(chalk.dim('  Checking prerequisites...'));

  // Verify env and setup
  let prereqsResult;
  try {
    prereqsResult = await collectSetupPrerequisites();
    
    // Check for critical env and paths
    if (!prereqsResult.env?.exists) {
      findings.push(
        createFinding({
          category: 'ssr',
          severity: 'high',
          description: 'SSR parity audit skipped: .env file not found',
          evidence: 'Cannot derive expected hosts without .env'
        })
      );

      diagnostics.push({
        level: 'warning',
        message: 'Skipping SSR parity audit due to missing .env'
      });

      return {
        target,
        findings,
        recommendations,
        diagnostics,
        metadata: {
          target,
          ssrAuditSkipped: true,
          reason: 'no_env_file'
        }
      };
    }

    const missingCommands = prereqsResult.commandSummary?.missing ?? [];
    const requiredForAudit = ['npm', 'npx']; // minimal requirements
    const missingRequired = missingCommands.filter((cmd) => requiredForAudit.includes(cmd));
    
    if (missingRequired.length > 0) {
      findings.push(
        createFinding({
          category: 'ssr',
          severity: 'high',
          description: `SSR parity audit skipped: missing required commands (${missingRequired.join(', ')})`,
          evidence: 'Cannot execute audit without required CLI tools'
        })
      );

      diagnostics.push({
        level: 'warning',
        message: `Skipping SSR parity audit due to missing: ${missingRequired.join(', ')}`
      });

      return {
        target,
        findings,
        recommendations,
        diagnostics,
        metadata: {
          target,
          ssrAuditSkipped: true,
          reason: 'missing_commands'
        }
      };
    }
  } catch (error) {
    findings.push(
      createFinding({
        category: 'ssr',
        severity: 'high',
        description: 'SSR parity audit error: failed to check prerequisites',
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
      metadata: { target, ssrAuditSkipped: true, reason: 'error' }
    };
  }

  // Derive expected hosts from .env
  let expectedHosts;
  try {
    const hosts = deriveExpectedHosts(prereqsResult.env.variables);
    
    // Build AST dev/Workers dev URLs from environment or defaults
    const projectName = hosts.projectName;
    const astroDev = process.env.ASTRO_DEV_URL || `http://localhost:4321`;
    const workersDev = process.env.WORKERS_DEV_URL || `http://localhost:8787`;
    
    expectedHosts = {
      projectName,
      astroDev,
      workersDev,
      ddevSite: hosts.expectedDrupalBaseUrl
    };
  } catch (error) {
    findings.push(
      createFinding({
        category: 'ssr',
        severity: 'high',
        description: 'SSR parity audit error: failed to derive expected hosts',
        evidence: error.message
      })
    );
    diagnostics.push({
      level: 'error',
      message: `Failed to derive hosts: ${error.message}`
    });
    return {
      target,
      findings,
      recommendations,
      diagnostics,
      metadata: { target, ssrAuditSkipped: true, reason: 'error' }
    };
  }

  console.log(chalk.dim('  Collecting snapshots from Astro dev...'));

  // Collect snapshots from both environments
  let snapshots;
  try {
    snapshots = await collectSnapshots(expectedHosts, diagnostics);

    if (!snapshots || snapshots.length === 0) {
      findings.push(
        createFinding({
          category: 'ssr',
          severity: 'medium',
          description: 'SSR parity audit: no snapshots collected',
          evidence: 'Snapshot collection returned empty array'
        })
      );

      diagnostics.push({
        level: 'warning',
        message: 'No snapshots available for SSR parity comparison'
      });

      return {
        target,
        findings,
        recommendations,
        diagnostics,
        metadata: {
          target,
          snapshotCount: 0,
          paritySummary: {}
        }
      };
    }

    diagnostics.push({
      level: 'info',
      message: `Collected ${snapshots.length} snapshots for parity comparison`
    });
  } catch (error) {
    findings.push(
      createFinding({
        category: 'ssr',
        severity: 'high',
        description: 'SSR parity audit error: snapshot collection failed',
        evidence: error.message
      })
    );

    diagnostics.push({
      level: 'error',
      message: `Snapshot collection error: ${error.message}`
    });

    return {
      target,
      findings,
      recommendations,
      diagnostics,
      metadata: { target, ssrAuditSkipped: true, reason: 'snapshot_error' }
    };
  }

  // Analyze parity across snapshots
  console.log(chalk.dim('  Analyzing SSR parity...'));

  const paritySummary = {
    totalSnapshots: snapshots.length,
    astroDevOk: 0,
    workersDevOk: 0,
    statusParity: 0,
    contentTypeParity: 0,
    headersParity: 0,
    timingDeltaAvg: 0
  };

  const timingDeltas = [];
  const parityIssues = [];

  snapshots.forEach((snapshot) => {
    const { path: pagePath, astro, workers } = snapshot;

    // Count success
    if (astro?.ok) paritySummary.astroDevOk += 1;
    if (workers?.ok) paritySummary.workersDevOk += 1;

    // Skip comparison if either failed
    if (!astro?.ok || !workers?.ok) {
      if (!astro?.ok) {
        parityIssues.push({
          path: pagePath,
          issue: 'astro_fetch_failed',
          details: astro?.error ?? 'Unknown error'
        });
      }
      if (!workers?.ok) {
        parityIssues.push({
          path: pagePath,
          issue: 'workers_fetch_failed',
          details: workers?.error ?? 'Unknown error'
        });
      }
      return;
    }

    // Compare responses
    const comparison = compareResponses(astro, workers);
    if (comparison.statusMatch) paritySummary.statusParity += 1;
    if (comparison.contentTypeMatch) paritySummary.contentTypeParity += 1;
    if (
      comparison.statusMatch &&
      comparison.contentTypeMatch &&
      comparison.cacheControlMatch
    ) {
      paritySummary.headersParity += 1;
    }

    if (comparison.durationDeltaMs !== null) {
      timingDeltas.push(comparison.durationDeltaMs);
    }

    // Flag mismatches
    if (!comparison.statusMatch) {
      parityIssues.push({
        path: pagePath,
        issue: 'status_mismatch',
        details: `Astro: ${astro.status}, Workers: ${workers.status}`
      });
    }

    if (!comparison.contentTypeMatch) {
      parityIssues.push({
        path: pagePath,
        issue: 'content_type_mismatch',
        details: `Astro: ${astro.headers['content-type']}, Workers: ${workers.headers['content-type']}`
      });
    }

    if (!comparison.cacheControlMatch) {
      parityIssues.push({
        path: pagePath,
        issue: 'cache_control_mismatch',
        details: `Astro: ${astro.headers['cache-control']}, Workers: ${workers.headers['cache-control']}`
      });
    }
  });

  // Calculate timing average
  if (timingDeltas.length > 0) {
    const sum = timingDeltas.reduce((a, b) => a + b, 0);
    paritySummary.timingDeltaAvg = Math.round(sum / timingDeltas.length);
  }

  // Generate findings based on parity analysis
  if (paritySummary.astroDevOk === 0) {
    findings.push(
      createFinding({
        category: 'ssr',
        severity: 'high',
        description: 'SSR parity audit: Astro dev server not reachable',
        evidence: `All ${snapshots.length} requests to Astro dev failed`
      })
    );
  } else if (paritySummary.astroDevOk < snapshots.length) {
    const failCount = snapshots.length - paritySummary.astroDevOk;
    findings.push(
      createFinding({
        category: 'ssr',
        severity: 'medium',
        description: `SSR parity audit: ${failCount} of ${snapshots.length} Astro dev requests failed`,
        evidence: `Success rate: ${paritySummary.astroDevOk}/${snapshots.length}`
      })
    );
  }

  if (paritySummary.workersDevOk === 0) {
    findings.push(
      createFinding({
        category: 'ssr',
        severity: 'high',
        description: 'SSR parity audit: Workers dev not reachable',
        evidence: `All ${snapshots.length} requests to Workers dev failed`
      })
    );
  } else if (paritySummary.workersDevOk < snapshots.length) {
    const failCount = snapshots.length - paritySummary.workersDevOk;
    findings.push(
      createFinding({
        category: 'ssr',
        severity: 'medium',
        description: `SSR parity audit: ${failCount} of ${snapshots.length} Workers dev requests failed`,
        evidence: `Success rate: ${paritySummary.workersDevOk}/${snapshots.length}`
      })
    );
  }

  // Status code parity
  if (paritySummary.statusParity < paritySummary.astroDevOk) {
    const mismatchCount = paritySummary.astroDevOk - paritySummary.statusParity;
    findings.push(
      createFinding({
        category: 'ssr',
        severity: 'low',
        description: `SSR parity audit: ${mismatchCount} status code mismatches between Astro and Workers`,
        evidence: `Status parity: ${paritySummary.statusParity}/${paritySummary.astroDevOk}`
      })
    );
  }

  // Content type parity
  if (paritySummary.contentTypeParity < paritySummary.astroDevOk) {
    const mismatchCount = paritySummary.astroDevOk - paritySummary.contentTypeParity;
    findings.push(
      createFinding({
        category: 'ssr',
        severity: 'low',
        description: `SSR parity audit: ${mismatchCount} content-type header mismatches`,
        evidence: `Content-type parity: ${paritySummary.contentTypeParity}/${paritySummary.astroDevOk}`
      })
    );
  }

  // Timing anomalies
  if (paritySummary.timingDeltaAvg > 500) {
    findings.push(
      createFinding({
        category: 'performance',
        severity: 'low',
        description: `SSR parity audit: Significant timing variance (avg delta ${paritySummary.timingDeltaAvg}ms)`,
        evidence: `Average timing delta: ${paritySummary.timingDeltaAvg}ms across ${timingDeltas.length} comparisons`
      })
    );
  }

  // Recommendations
  if (parityIssues.length > 0) {
    const issueTypes = new Set(parityIssues.map((i) => i.issue));
    if (issueTypes.has('astro_fetch_failed')) {
      recommendations.push(
        createRecommendation({
          action: 'Verify Astro dev server is running (npm run dev) on the expected port',
          impact: 'reliability',
          effort: 'trivial',
          relatedFindingIds: findings.filter((f) => f.description.includes('Astro')).map((f) => f.id)
        })
      );
    }

    if (issueTypes.has('workers_fetch_failed')) {
      recommendations.push(
        createRecommendation({
          action: 'Verify Workers dev is running (npx wrangler dev --remote) on the expected port',
          impact: 'reliability',
          effort: 'trivial',
          relatedFindingIds: findings.filter((f) => f.description.includes('Workers')).map((f) => f.id)
        })
      );
    }

    if (
      issueTypes.has('status_mismatch') ||
      issueTypes.has('content_type_mismatch') ||
      issueTypes.has('cache_control_mismatch')
    ) {
      recommendations.push(
        createRecommendation({
          action: 'Review Astro config (astro.config.mjs) and Workers adapter settings to ensure parity in headers and status handling',
          impact: 'DX',
          effort: 'medium',
          relatedFindingIds: findings.filter((f) => f.description.includes('mismatch')).map((f) => f.id)
        })
      );
    }
  }

  diagnostics.push({
    level: 'info',
    message: `SSR Parity Summary: Astro dev ${paritySummary.astroDevOk}/${paritySummary.totalSnapshots} ok, Workers dev ${paritySummary.workersDevOk}/${paritySummary.totalSnapshots} ok`
  });

  if (paritySummary.statusParity === paritySummary.astroDevOk && paritySummary.workersDevOk > 0) {
    diagnostics.push({
      level: 'info',
      message: 'SSR parity gate PASS: Status codes match across all snapshots'
    });
  }

  return {
    target,
    findings,
    recommendations,
    diagnostics,
    metadata: {
      target,
      snapshotCount: snapshots.length,
      paritySummary,
      parityIssueCount: parityIssues.length
    }
  };
};

export default run;
