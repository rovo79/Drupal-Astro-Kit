import crypto from 'node:crypto';
import chalk from 'chalk';
import {
  AUDIT_TARGETS,
  FINDING_CATEGORIES,
  ENV_KEYS,
  resolveFromProjectRoot
} from './util/constants.js';
import { createJsonApiClient } from './util/jsonapiClient.js';
import { collectSetupPrerequisites, deriveExpectedHosts } from './check_env.js';

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
 * Test resources to fetch and deserialize from Drupal JSON:API
 * These should exist in a fresh Drupal installation
 */
const TEST_RESOURCES = [
  {
    type: 'node--page',
    name: 'Pages',
    description: 'Basic page nodes'
  },
  {
    type: 'node--article',
    name: 'Articles',
    description: 'Sample article nodes'
  },
  {
    type: 'taxonomy_term--tags',
    name: 'Tags',
    description: 'Sample taxonomy tags'
  }
];

/**
 * Audit JSON:API integration with Drupal
 * Tests fetch, deserialization with jsona, and query building with drupal-jsonapi-params
 */
export const run = async ({ target = AUDIT_TARGETS.API } = {}) => {
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
          category: 'api',
          severity: 'high',
          description: 'JSON:API audit skipped: .env file not found',
          evidence: 'Cannot derive DRUPAL_JSONAPI_URL without .env'
        })
      );

      diagnostics.push({
        level: 'warning',
        message: 'Skipping JSON:API audit due to missing .env'
      });

      return {
        target,
        findings,
        recommendations,
        diagnostics,
        metadata: {
          target,
          apiAuditSkipped: true,
          reason: 'no_env_file'
        }
      };
    }
  } catch (error) {
    findings.push(
      createFinding({
        category: 'api',
        severity: 'high',
        description: 'JSON:API audit error: failed to check prerequisites',
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
      metadata: { target, apiAuditSkipped: true, reason: 'error' }
    };
  }

  // Get DRUPAL_JSONAPI_URL from environment
  const drupalApiUrl = prereqsResult.env.variables[ENV_KEYS.DRUPAL_JSONAPI_URL];

  if (!drupalApiUrl) {
    findings.push(
      createFinding({
        category: 'api',
        severity: 'high',
        description: 'JSON:API audit skipped: DRUPAL_JSONAPI_URL not configured',
        evidence: `${ENV_KEYS.DRUPAL_JSONAPI_URL} missing from .env`
      })
    );

    recommendations.push(
      createRecommendation({
        action: `Add ${ENV_KEYS.DRUPAL_JSONAPI_URL} to .env (e.g., http://{PROJECT_NAME}.ddev.site/jsonapi)`,
        impact: 'correctness',
        effort: 'trivial',
        relatedFindingIds: findings.filter((f) => f.description.includes('DRUPAL_JSONAPI_URL')).map((f) => f.id)
      })
    );

    diagnostics.push({
      level: 'warning',
      message: 'Skipping JSON:API audit: DRUPAL_JSONAPI_URL not configured'
    });

    return {
      target,
      findings,
      recommendations,
      diagnostics,
      metadata: {
        target,
        apiAuditSkipped: true,
        reason: 'no_api_url'
      }
    };
  }

  console.log(chalk.dim('  Creating JSON:API client...'));

  // Create client
  let client;
  try {
    client = createJsonApiClient({
      baseUrl: drupalApiUrl,
      timeoutMs: 10000
    });

    diagnostics.push({
      level: 'debug',
      message: `JSON:API client created for ${drupalApiUrl}`
    });
  } catch (error) {
    findings.push(
      createFinding({
        category: 'api',
        severity: 'high',
        description: 'JSON:API audit error: failed to create client',
        evidence: error.message
      })
    );

    diagnostics.push({
      level: 'error',
      message: `Failed to create client: ${error.message}`
    });

    return {
      target,
      findings,
      recommendations,
      diagnostics,
      metadata: { target, apiAuditSkipped: true, reason: 'client_error' }
    };
  }

  // Test resources
  console.log(chalk.dim('  Testing JSON:API endpoints...'));

  const testResults = [];
  let successCount = 0;
  let deserializeSuccessCount = 0;

  for (const resource of TEST_RESOURCES) {
    try {
      diagnostics.push({
        level: 'debug',
        message: `Attempting to fetch ${resource.type}...`
      });

      const result = await client.fetchCollection(resource.type);

      testResults.push({
        resourceType: resource.type,
        resourceName: resource.name,
        status: 'success',
        recordCount: Array.isArray(result.data) ? result.data.length : 1,
        durationMs: result.meta.durationMs,
        hasData: !!result.data
      });

      successCount += 1;

      if (result.data) {
        deserializeSuccessCount += 1;
      }

      diagnostics.push({
        level: 'debug',
        message: `✓ ${resource.type}: fetched and deserialized ${Array.isArray(result.data) ? result.data.length : 1} record(s) in ${result.meta.durationMs}ms`
      });
    } catch (error) {
      testResults.push({
        resourceType: resource.type,
        resourceName: resource.name,
        status: 'failed',
        error: error.message
      });

      diagnostics.push({
        level: 'debug',
        message: `✗ ${resource.type}: ${error.message}`
      });
    }
  }

  // Analyze results
  const failedCount = TEST_RESOURCES.length - successCount;

  // T027: TODO: Add performance audit (cache headers check)
  // T028: TODO: Add security audit (anonymous user access check)

  if (failedCount === TEST_RESOURCES.length) {
    findings.push(
      createFinding({
        category: 'api',
        severity: 'high',
        description: 'JSON:API audit: Drupal API not reachable',
        evidence: `All ${TEST_RESOURCES.length} resource fetch attempts failed`
      })
    );

    recommendations.push(
      createRecommendation({
        action: 'Verify Drupal is running (ddev launch) and JSON:API module is enabled (Drupal 11 default)',
        impact: 'reliability',
        effort: 'trivial',
        relatedFindingIds: findings.filter((f) => f.description.includes('not reachable')).map((f) => f.id)
      })
    );
  } else if (failedCount > 0) {
    findings.push(
      createFinding({
        category: 'api',
        severity: 'medium',
        description: `JSON:API audit: ${failedCount} of ${TEST_RESOURCES.length} resource types unavailable`,
        evidence: `Success rate: ${successCount}/${TEST_RESOURCES.length}`
      })
    );

    recommendations.push(
      createRecommendation({
        action: 'Check Drupal content types and ensure sample data exists for all tested resource types',
        impact: 'DX',
        effort: 'low',
        relatedFindingIds: findings.filter((f) => f.description.includes('unavailable')).map((f) => f.id)
      })
    );
  }

  if (successCount > 0 && deserializeSuccessCount < successCount) {
    findings.push(
      createFinding({
        category: 'api',
        severity: 'medium',
        description: `JSON:API audit: ${successCount - deserializeSuccessCount} resources fetched but deserialization may have failed`,
        evidence: `Deserialization success: ${deserializeSuccessCount}/${successCount}`
      })
    );

    recommendations.push(
      createRecommendation({
        action: 'Verify jsona deserializer configuration and JSON:API response schema compliance',
        impact: 'correctness',
        effort: 'medium',
        relatedFindingIds: findings.filter((f) => f.description.includes('deserialization')).map((f) => f.id)
      })
    );
  }

  // Check query builder integration
  if (successCount > 0) {
    try {
      const params = client.paramsBuilder();
      params.addFilter('status', '1');
      const query = params.getQueryString();

      if (query) {
        diagnostics.push({
          level: 'debug',
          message: `Query builder working: generated "${query}"`
        });
      }
    } catch (error) {
      findings.push(
        createFinding({
          category: 'api',
          severity: 'low',
          description: 'JSON:API audit: drupal-jsonapi-params query builder not working',
          evidence: error.message
        })
      );

      recommendations.push(
        createRecommendation({
          action: 'Verify drupal-jsonapi-params is installed and compatible with Drupal JSON:API',
          impact: 'DX',
          effort: 'trivial'
        })
      );
    }
  }

  // Success summary
  if (failedCount === 0) {
    diagnostics.push({
      level: 'info',
      message: `JSON:API integration gate PASS: All ${successCount} resource types reachable and deserialized`
    });
  }

  diagnostics.push({
    level: 'info',
    message: `JSON:API Integration Summary: ${successCount}/${TEST_RESOURCES.length} resources ok, ${deserializeSuccessCount} deserialized`
  });

  return {
    target,
    findings,
    recommendations,
    diagnostics,
    metadata: {
      target,
      apiUrl: drupalApiUrl,
      testResourceCount: TEST_RESOURCES.length,
      successCount,
      deserializeSuccessCount,
      testResults
    }
  };
};

export default run;
