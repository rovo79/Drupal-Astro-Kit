import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';

/**
 * Parse GitHub Actions workflow YAML file
 * Extracts job definitions, steps, triggers, and dependencies
 */
export const parseWorkflowFile = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const workflow = yaml.load(content);

    if (!workflow) {
      return { error: 'Failed to parse YAML' };
    }

    return {
      name: workflow.name || 'Unknown',
      triggers: normalizeTriggers(workflow.on),
      env: workflow.env || {},
      jobs: parseJobs(workflow.jobs || {}),
      raw: workflow
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    };
  }
};

const normalizeTriggers = (triggers) => {
  if (!triggers) return [];
  if (typeof triggers === 'string') return [triggers];
  if (Array.isArray(triggers)) return triggers;
  return Object.keys(triggers);
};

const parseJobs = (jobs) => {
  const parsed = {};

  Object.entries(jobs).forEach(([jobName, jobConfig]) => {
    if (!jobConfig || typeof jobConfig !== 'object') {
      return;
    }

    const steps = Array.isArray(jobConfig.steps) ? jobConfig.steps : [];

    parsed[jobName] = {
      name: jobName,
      runsOn: jobConfig['runs-on'] || 'unknown',
      needs: normalizeDependencies(jobConfig.needs),
      steps: steps.map((step) => ({
        name: step.name || '(unnamed)',
        uses: step.uses || null,
        run: step.run || null,
        if: step.if || null
      })),
      environment: jobConfig.environment || null,
      condition: jobConfig.if || null,
      stepCount: steps.length
    };
  });

  return parsed;
};

const normalizeDependencies = (needs) => {
  if (!needs) return [];
  if (typeof needs === 'string') return [needs];
  if (Array.isArray(needs)) return needs;
  return [];
};

/**
 * Analyze workflow for expected checks
 * Returns findings about missing/present validation steps
 */
export const analyzeWorkflow = (parsedWorkflow) => {
  const findings = {
    hasValidation: false,
    hasFrontendTests: false,
    hasBackendTests: false,
    hasFrontendBuild: false,
    hasBackendBuild: false,
    hasDeploy: false,
    deploymentJobs: [],
    testJobs: [],
    buildJobs: [],
    issues: []
  };

  if (!parsedWorkflow.jobs) {
    findings.issues.push('No jobs found in workflow');
    return findings;
  }

  Object.entries(parsedWorkflow.jobs).forEach(([jobName, job]) => {
    // Check for validation
    if (jobName === 'validate' || jobName.includes('check') || jobName.includes('lint')) {
      findings.hasValidation = true;
    }

    // Check for frontend tests
    if (jobName.includes('frontend') || jobName.includes('astro')) {
      const hasTest = job.steps.some((step) => step.name?.toLowerCase().includes('test'));
      if (hasTest) {
        findings.hasFrontendTests = true;
        findings.testJobs.push(jobName);
      }
    }

    // Check for backend tests
    if (jobName.includes('backend') || jobName.includes('drupal')) {
      const hasTest = job.steps.some(
        (step) =>
          step.name?.toLowerCase().includes('test') ||
          step.run?.toLowerCase().includes('drush test')
      );
      if (hasTest) {
        findings.hasBackendTests = true;
        findings.testJobs.push(jobName);
      }
    }

    // Check for frontend build
    if (jobName.includes('frontend') || jobName.includes('astro')) {
      const hasBuild = job.steps.some(
        (step) =>
          step.name?.toLowerCase().includes('build') || step.run?.toLowerCase().includes('npm run build')
      );
      if (hasBuild) {
        findings.hasFrontendBuild = true;
        findings.buildJobs.push(jobName);
      }
    }

    // Check for backend build/install
    if (jobName.includes('backend') || jobName.includes('drupal')) {
      const hasBuild = job.steps.some(
        (step) =>
          step.name?.toLowerCase().includes('install') || step.run?.toLowerCase().includes('composer install')
      );
      if (hasBuild) {
        findings.hasBackendBuild = true;
        findings.buildJobs.push(jobName);
      }
    }

    // Check for deployment
    if (jobName.includes('deploy') || jobName.includes('release')) {
      findings.hasDeploy = true;
      findings.deploymentJobs.push(jobName);
    }

    // Check deploy steps in any job
    job.steps.forEach((step) => {
      if (
        step.uses?.includes('deploy') ||
        step.uses?.includes('cloudflare') ||
        step.name?.toLowerCase().includes('deploy') ||
        step.run?.toLowerCase().includes('deploy')
      ) {
        findings.hasDeploy = true;
        if (!findings.deploymentJobs.includes(jobName)) {
          findings.deploymentJobs.push(jobName);
        }
      }
    });
  });

  return findings;
};

/**
 * Get workflow file paths in a directory
 */
export const findWorkflowFiles = async (workflowDir) => {
  try {
    const files = await fs.readdir(workflowDir);
    return files
      .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
      .map((file) => path.join(workflowDir, file));
  } catch (error) {
    return [];
  }
};

export default { parseWorkflowFile, analyzeWorkflow, findWorkflowFiles };
