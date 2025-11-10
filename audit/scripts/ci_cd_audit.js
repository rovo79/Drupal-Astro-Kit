import crypto from 'node:crypto';
import path from 'node:path';
import chalk from 'chalk';
import {
  AUDIT_TARGETS,
  FINDING_CATEGORIES,
  PROJECT_ROOT,
  resolveFromProjectRoot
} from './util/constants.js';
import { parseWorkflowFile, analyzeWorkflow, findWorkflowFiles } from './util/workflowParser.js';
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
 * Audit CI/CD pipeline configuration
 * Validates workflow structure, required steps, and branch triggers
 */
export const run = async ({ target = AUDIT_TARGETS.CI } = {}) => {
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
          category: 'ci',
          severity: 'high',
          description: 'CI/CD audit error: failed to inspect repository paths',
          evidence: 'Cannot verify workflow directory'
        })
      );

      diagnostics.push({
        level: 'error',
        message: 'Skipping CI/CD audit due to path inspection failure'
      });

      return {
        target,
        findings,
        recommendations,
        diagnostics,
        metadata: {
          target,
          ciAuditSkipped: true,
          reason: 'path_error'
        }
      };
    }
  } catch (error) {
    findings.push(
      createFinding({
        category: 'ci',
        severity: 'high',
        description: 'CI/CD audit error: failed to check prerequisites',
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
      metadata: { target, ciAuditSkipped: true, reason: 'error' }
    };
  }

  console.log(chalk.dim('  Scanning workflow files...'));

  // Find workflow files
  const workflowDir = resolveFromProjectRoot('.github/workflows');
  let workflowFiles;
  try {
    workflowFiles = await findWorkflowFiles(workflowDir);

    if (workflowFiles.length === 0) {
      findings.push(
        createFinding({
          category: 'ci',
          severity: 'medium',
          description: 'CI/CD audit: no workflow files found',
          evidence: `No .yml/.yaml files in ${workflowDir}`
        })
      );

      recommendations.push(
        createRecommendation({
          action: 'Create GitHub Actions workflows in .github/workflows/ with validation, build, test, and deploy steps',
          impact: 'reliability',
          effort: 'high',
          relatedFindingIds: findings.filter((f) => f.description.includes('no workflow')).map((f) => f.id)
        })
      );

      diagnostics.push({
        level: 'warning',
        message: 'No workflow files found'
      });

      return {
        target,
        findings,
        recommendations,
        diagnostics,
        metadata: {
          target,
          workflowCount: 0
        }
      };
    }

    diagnostics.push({
      level: 'info',
      message: `Found ${workflowFiles.length} workflow file(s)`
    });
  } catch (error) {
    findings.push(
      createFinding({
        category: 'ci',
        severity: 'high',
        description: 'CI/CD audit error: failed to scan workflow directory',
        evidence: error.message
      })
    );

    diagnostics.push({
      level: 'error',
      message: `Workflow scan failed: ${error.message}`
    });

    return {
      target,
      findings,
      recommendations,
      diagnostics,
      metadata: { target, ciAuditSkipped: true, reason: 'scan_error' }
    };
  }

  // Parse and analyze workflows
  console.log(chalk.dim('  Analyzing workflow structure...'));

  const workflowAnalysis = [];
  let parseErrors = 0;

  for (const filePath of workflowFiles) {
    const fileName = path.basename(filePath);

    try {
      const parsed = await parseWorkflowFile(filePath);

      if (parsed.error) {
        parseErrors += 1;
        diagnostics.push({
          level: 'warn',
          message: `Failed to parse ${fileName}: ${parsed.error}`
        });
        continue;
      }

      const analysis = analyzeWorkflow(parsed);
      workflowAnalysis.push({
        file: fileName,
        workflow: parsed,
        analysis
      });

      diagnostics.push({
        level: 'debug',
        message: `Parsed ${fileName}: ${parsed.triggers.length} trigger(s), ${Object.keys(parsed.jobs).length} job(s)`
      });
    } catch (error) {
      parseErrors += 1;
      diagnostics.push({
        level: 'warn',
        message: `Exception parsing ${fileName}: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  if (parseErrors > 0 && workflowAnalysis.length === 0) {
    findings.push(
      createFinding({
        category: 'ci',
        severity: 'high',
        description: `CI/CD audit: failed to parse ${parseErrors} workflow file(s)`,
        evidence: `All ${workflowFiles.length} workflow(s) failed to parse`
      })
    );

    recommendations.push(
      createRecommendation({
        action: 'Verify workflow YAML syntax using GitHub Actions schema validation',
        impact: 'correctness',
        effort: 'low'
      })
    );
  }

  // Validate workflow completeness
  const mainWorkflow = workflowAnalysis.find((w) => w.file === 'main.yml');

  if (!mainWorkflow) {
    findings.push(
      createFinding({
        category: 'ci',
        severity: 'medium',
        description: 'CI/CD audit: main.yml workflow not found',
        evidence: `Workflows found: ${workflowAnalysis.map((w) => w.file).join(', ')}`
      })
    );

    recommendations.push(
      createRecommendation({
        action: 'Create main.yml as primary CI/CD workflow with validation, build, test, and deploy jobs',
        impact: 'reliability',
        effort: 'medium'
      })
    );
  }

  // Analyze first workflow (or main.yml if available)
  const targetWorkflow = mainWorkflow || workflowAnalysis[0];

  if (!targetWorkflow) {
    diagnostics.push({
      level: 'warning',
      message: 'No analyzable workflows available'
    });

    return {
      target,
      findings,
      recommendations,
      diagnostics,
      metadata: {
        target,
        workflowCount: workflowFiles.length,
        parseErrors
      }
    };
  }

  const { analysis } = targetWorkflow;

  // Check for required validation gates
  if (!analysis.hasValidation) {
    findings.push(
      createFinding({
        category: 'ci',
        severity: 'medium',
        description: 'CI/CD audit: no validation job found',
        evidence: 'Workflow lacks environment/config validation steps'
      })
    );

    recommendations.push(
      createRecommendation({
        action: 'Add validation job to check .env, wrangler.toml, and required files exist',
        impact: 'reliability',
        effort: 'low',
        relatedFindingIds: findings.filter((f) => f.description.includes('validation')).map((f) => f.id)
      })
    );
  }

  // Check for frontend pipeline
  if (!analysis.hasFrontendBuild) {
    findings.push(
      createFinding({
        category: 'ci',
        severity: 'high',
        description: 'CI/CD audit: no frontend build step found',
        evidence: 'Workflow missing npm build or equivalent'
      })
    );

    recommendations.push(
      createRecommendation({
        action: 'Add frontend job with: npm install, npm test (if applicable), npm run build',
        impact: 'correctness',
        effort: 'medium',
        relatedFindingIds: findings.filter((f) => f.description.includes('frontend build')).map((f) => f.id)
      })
    );
  }

  if (!analysis.hasFrontendTests && analysis.hasFrontendBuild) {
    findings.push(
      createFinding({
        category: 'ci',
        severity: 'low',
        description: 'CI/CD audit: frontend tests not configured',
        evidence: 'Frontend build job exists but no test step found'
      })
    );

    recommendations.push(
      createRecommendation({
        action: 'Add npm test step to frontend job or skip if no tests present',
        impact: 'DX',
        effort: 'low'
      })
    );
  }

  // Check for backend pipeline
  if (!analysis.hasBackendBuild) {
    findings.push(
      createFinding({
        category: 'ci',
        severity: 'high',
        description: 'CI/CD audit: no backend build/install step found',
        evidence: 'Workflow missing composer install or DDEV setup'
      })
    );

    recommendations.push(
      createRecommendation({
        action: 'Add backend job with: DDEV setup, composer install, drush deploy',
        impact: 'correctness',
        effort: 'medium',
        relatedFindingIds: findings.filter((f) => f.description.includes('backend')).map((f) => f.id)
      })
    );
  }

  // Check for deployment
  if (!analysis.hasDeploy) {
    findings.push(
      createFinding({
        category: 'ci',
        severity: 'high',
        description: 'CI/CD audit: no deployment steps found',
        evidence: 'Workflow has build steps but no deploy steps'
      })
    );

    recommendations.push(
      createRecommendation({
        action: 'Add deployment steps: Cloudflare Workers (frontend) and DDEV/hosting provider (backend)',
        impact: 'reliability',
        effort: 'high',
        relatedFindingIds: findings.filter((f) => f.description.includes('deployment')).map((f) => f.id)
      })
    );
  }

  // Check for branch triggers
  const hasTriggers = (targetWorkflow.workflow?.triggers ?? []).length > 0;
  if (!hasTriggers) {
    findings.push(
      createFinding({
        category: 'ci',
        severity: 'medium',
        description: 'CI/CD audit: no triggers configured',
        evidence: 'Workflow on: section is empty or missing'
      })
    );

    recommendations.push(
      createRecommendation({
        action: 'Configure triggers: push to main/staging branches, pull requests',
        impact: 'reliability',
        effort: 'low'
      })
    );
  }

  // Success summary
  const checksOk = [analysis.hasValidation, analysis.hasFrontendBuild, analysis.hasBackendBuild].filter(
    Boolean
  ).length;
  const totalChecks = 3;

  diagnostics.push({
    level: 'info',
    message: `CI/CD Summary: ${analysis.hasFrontendBuild ? '✓' : '✗'} frontend build, ${analysis.hasBackendBuild ? '✓' : '✗'} backend build, ${analysis.hasDeploy ? '✓' : '✗'} deploy`
  });

  if (checksOk === totalChecks && analysis.hasDeploy) {
    diagnostics.push({
      level: 'info',
      message: 'CI/CD validation gate PASS: All required pipeline stages present'
    });
  }

  return {
    target,
    findings,
    recommendations,
    diagnostics,
    metadata: {
      target,
      workflowFile: targetWorkflow.file,
      workflowCount: workflowAnalysis.length,
      parseErrors,
      analysis: {
        hasValidation: analysis.hasValidation,
        hasFrontendBuild: analysis.hasFrontendBuild,
        hasFrontendTests: analysis.hasFrontendTests,
        hasBackendBuild: analysis.hasBackendBuild,
        hasBackendTests: analysis.hasBackendTests,
        hasDeploy: analysis.hasDeploy,
        jobCount: Object.keys(targetWorkflow.workflow.jobs).length,
        triggers: targetWorkflow.workflow.triggers
      }
    }
  };
};

export default run;
