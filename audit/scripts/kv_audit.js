import crypto from 'node:crypto';
import chalk from 'chalk';
import {
  AUDIT_TARGETS,
  FINDING_CATEGORIES,
  ENV_KEYS
} from './util/constants.js';
import { runKvProbe } from './util/kvTest.js';
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
 * Audit KV namespace configuration and functionality
 * Tests SESSION KV binding read/write/delete cycle
 */
export const run = async ({ target = AUDIT_TARGETS.KV } = {}) => {
  const findings = [];
  const recommendations = [];
  const diagnostics = [];

  console.log(chalk.dim('  Checking prerequisites...'));

  // Verify env and setup
  let prereqsResult;
  try {
    prereqsResult = await collectSetupPrerequisites();

    if (!prereqsResult.env?.exists) {
      findings.push(
        createFinding({
          category: 'kv',
          severity: 'high',
          description: 'KV audit skipped: .env file not found',
          evidence: 'Cannot derive configuration without .env'
        })
      );

      diagnostics.push({
        level: 'warning',
        message: 'Skipping KV audit due to missing .env'
      });

      return {
        target,
        findings,
        recommendations,
        diagnostics,
        metadata: {
          target,
          kvAuditSkipped: true,
          reason: 'no_env_file'
        }
      };
    }
  } catch (error) {
    findings.push(
      createFinding({
        category: 'kv',
        severity: 'high',
        description: 'KV audit error: failed to check prerequisites',
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
      metadata: { target, kvAuditSkipped: true, reason: 'error' }
    };
  }

  // Check for Workers dev running
  const workersDev = prereqsResult.env.variables[ENV_KEYS.WORKERS_DEV_URL] || 'http://localhost:8787';

  console.log(chalk.dim('  Testing KV namespace via Workers runtime...'));

  // Run KV probe
  let probeResult;
  try {
    probeResult = await runKvProbe({
      baseUrl: workersDev,
      route: '/kv-check',
      timeoutMs: 10000
    });

    diagnostics.push({
      level: 'debug',
      message: `KV probe target: ${probeResult.endpoint}`
    });
  } catch (error) {
    findings.push(
      createFinding({
        category: 'kv',
        severity: 'high',
        description: 'KV audit error: failed to execute probe',
        evidence: error.message
      })
    );

    diagnostics.push({
      level: 'error',
      message: `KV probe execution failed: ${error.message}`
    });

    return {
      target,
      findings,
      recommendations,
      diagnostics,
      metadata: { target, kvAuditSkipped: true, reason: 'probe_error' }
    };
  }

  // Analyze probe results
  if (probeResult.error) {
    findings.push(
      createFinding({
        category: 'kv',
        severity: 'high',
        description: 'KV audit: probe execution failed',
        evidence: probeResult.error
      })
    );

    recommendations.push(
      createRecommendation({
        action: 'Verify Workers dev is running (npx wrangler dev --remote) and /kv-check route is available',
        impact: 'reliability',
        effort: 'trivial',
        relatedFindingIds: findings.filter((f) => f.description.includes('probe')).map((f) => f.id)
      })
    );

    diagnostics.push({
      level: 'warning',
      message: `KV probe failed: ${probeResult.error}`
    });

    return {
      target,
      findings,
      recommendations,
      diagnostics,
      metadata: {
        target,
        kvAuditSkipped: true,
        reason: 'probe_failed',
        probeResult
      }
    };
  }

  // Check write operation
  if (!probeResult.write?.ok) {
    findings.push(
      createFinding({
        category: 'kv',
        severity: 'high',
        description: `KV audit: write operation failed (HTTP ${probeResult.write?.status ?? 'unknown'})`,
        evidence: `Write endpoint returned ${probeResult.write?.status ?? 'no response'}`
      })
    );

    const errorMessage = probeResult.write?.body?.error;
    if (errorMessage) {
      diagnostics.push({
        level: 'debug',
        message: `Write error details: ${errorMessage}`
      });
    }

    recommendations.push(
      createRecommendation({
        action: 'Verify SESSION KV binding is configured in wrangler.toml and accessible from Workers runtime',
        impact: 'reliability',
        effort: 'low',
        relatedFindingIds: findings.filter((f) => f.description.includes('write')).map((f) => f.id)
      })
    );

    return {
      target,
      findings,
      recommendations,
      diagnostics,
      metadata: {
        target,
        probeResult,
        writeStatus: probeResult.write?.status
      }
    };
  }

  diagnostics.push({
    level: 'debug',
    message: `KV write successful: key="${probeResult.key}" in ${probeResult.write.durationMs}ms`
  });

  // Check read operation
  if (!probeResult.read?.ok) {
    findings.push(
      createFinding({
        category: 'kv',
        severity: 'high',
        description: `KV audit: read operation failed (HTTP ${probeResult.read?.status ?? 'unknown'})`,
        evidence: `Read endpoint returned ${probeResult.read?.status ?? 'no response'}`
      })
    );

    recommendations.push(
      createRecommendation({
        action: 'Verify KV namespace is properly bound and readable within Workers context',
        impact: 'reliability',
        effort: 'medium',
        relatedFindingIds: findings.filter((f) => f.description.includes('read')).map((f) => f.id)
      })
    );

    return {
      target,
      findings,
      recommendations,
      diagnostics,
      metadata: {
        target,
        probeResult,
        readStatus: probeResult.read?.status
      }
    };
  }

  diagnostics.push({
    level: 'debug',
    message: `KV read successful: retrieved value in ${probeResult.read.durationMs}ms`
  });

  // Check value consistency
  if (!probeResult.success) {
    findings.push(
      createFinding({
        category: 'kv',
        severity: 'medium',
        description: 'KV audit: write/read value mismatch',
        evidence: `Written: "${probeResult.attemptedValue}", Read: "${probeResult.read.body?.value ?? 'null'}"`
      })
    );

    recommendations.push(
      createRecommendation({
        action: 'Verify KV serialization/deserialization is correctly handling data types',
        impact: 'correctness',
        effort: 'low',
        relatedFindingIds: findings.filter((f) => f.description.includes('mismatch')).map((f) => f.id)
      })
    );
  }

  // Check delete operation (cleanup)
  if (!probeResult.delete?.ok && probeResult.delete !== null) {
    findings.push(
      createFinding({
        category: 'kv',
        severity: 'low',
        description: `KV audit: cleanup (delete) operation failed (HTTP ${probeResult.delete?.status ?? 'unknown'})`,
        evidence: `Delete returned ${probeResult.delete?.status ?? 'no response'}`
      })
    );

    recommendations.push(
      createRecommendation({
        action: 'Verify delete operation is supported by KV handler or manually clean up test keys',
        impact: 'DX',
        effort: 'trivial',
        relatedFindingIds: findings.filter((f) => f.description.includes('delete')).map((f) => f.id)
      })
    );
  } else if (probeResult.delete?.ok) {
    diagnostics.push({
      level: 'debug',
      message: `KV cleanup successful: test key deleted in ${probeResult.delete.durationMs}ms`
    });
  }

  // Performance check
  const totalDuration = (probeResult.write?.durationMs ?? 0) + (probeResult.read?.durationMs ?? 0);
  if (totalDuration > 1000) {
    findings.push(
      createFinding({
        category: 'performance',
        severity: 'low',
        description: `KV audit: high latency (total ${totalDuration}ms for write+read cycle)`,
        evidence: `Write: ${probeResult.write?.durationMs ?? '?'}ms, Read: ${probeResult.read?.durationMs ?? '?'}ms`
      })
    );
  }

  // Success summary
  if (probeResult.success && findings.length === 0) {
    diagnostics.push({
      level: 'info',
      message: `KV integration gate PASS: SESSION namespace read/write/delete cycle successful`
    });
  }

  diagnostics.push({
    level: 'info',
    message: `KV Audit Summary: Write ${probeResult.write?.ok ? 'ok' : 'failed'}, Read ${probeResult.read?.ok ? 'ok' : 'failed'}, Value match ${probeResult.success ? 'yes' : 'no'}`
  });

  return {
    target,
    findings,
    recommendations,
    diagnostics,
    metadata: {
      target,
      probeResult,
      kvNamespace: 'SESSION',
      endpoint: probeResult.endpoint,
      success: probeResult.success && findings.length === 0
    }
  };
};

export default run;
