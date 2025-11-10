import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  ENV_KEYS,
  PROJECT_ROOT,
  resolveFromProjectRoot,
  AUDIT_TARGETS,
  FINDING_CATEGORIES
} from './util/constants.js';
import {
  collectSetupPrerequisites,
  deriveExpectedHosts
} from './check_env.js';
import { timedFetch } from './util/ssrFetch.js';

const HIGH_SEVERITY = new Set(['high']);

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

const createRecommendation = ({ action, impact = 'DX', effort = 'low', status = 'proposed', relatedFindingIds = [] }) => ({
  id: createId('rec'),
  relatedFindingIds,
  action,
  impact,
  effort,
  status
});

const checkWranglerConfig = async () => {
  const wranglerPath = resolveFromProjectRoot('wrangler.toml');

  try {
    const content = await fs.readFile(wranglerPath, 'utf8');
    const hasMain = /main\s*=\s*"\.\/astro-frontend\/dist\/_worker\.js\/index\.js"/m.test(content);
    const hasAssetsBinding = /\[assets\][\s\S]*?binding\s*=\s*"ASSETS"/m.test(content);
    const hasSessionBinding = /\[\[kv_namespaces\]\][\s\S]*?binding\s*=\s*"SESSION"/m.test(content);

    return {
      exists: true,
      hasMain,
      hasAssetsBinding,
      hasSessionBinding,
      content
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        exists: false,
        hasMain: false,
        hasAssetsBinding: false,
        hasSessionBinding: false,
        content: null
      };
    }

    throw error;
  }
};

const checkAstroConfig = async () => {
  const astroConfigPath = resolveFromProjectRoot('astro-frontend/astro.config.mjs');

  try {
    const content = await fs.readFile(astroConfigPath, 'utf8');
    const hasServerOutput = /output\s*:\s*['"]server['"]/m.test(content);
    const usesCloudflare = /cloudflare\(/m.test(content) || /@astrojs\/cloudflare/.test(content);

    return {
      exists: true,
      hasServerOutput,
      usesCloudflare,
      content
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        exists: false,
        hasServerOutput: false,
        usesCloudflare: false,
        content: null
      };
    }

    throw error;
  }
};

const probeDrupalSite = async (baseUrl) => {
  if (!baseUrl) {
    return null;
  }

  return timedFetch(baseUrl, { timeoutMs: 4000, readMode: 'text' });
};

const run = async ({ target = AUDIT_TARGETS.SETUP } = {}) => {
  const findings = [];
  const recommendations = [];
  const diagnostics = [];

  const {
    env,
    commands,
    commandSummary,
    expectedHosts,
    paths
  } = await collectSetupPrerequisites();

  const pathStatusMap = paths.reduce(
    (acc, entry) => {
      acc[entry.path] = entry;
      return acc;
    },
    {}
  );
  const wranglerStatus = await checkWranglerConfig();
  const astroStatus = await checkAstroConfig();

  const envProjectName = env.variables[ENV_KEYS.PROJECT_NAME];
  const projectDirName = path.basename(PROJECT_ROOT);
  const drupalApiUrl = env.variables[ENV_KEYS.DRUPAL_API_URL];
  const drupalBaseUrl = env.variables[ENV_KEYS.DRUPAL_BASE_URL];

  if (env.error) {
    const finding = createFinding({
      category: 'setup',
      severity: 'high',
      description: `Failed to read .env file: ${env.error.message}`,
      evidence: env.path
    });
    findings.push(finding);
  } else if (!env.exists) {
    const recommendation = createRecommendation({
      action: 'Run ./setup.sh to generate the .env file with project-specific values',
      impact: 'DX',
      effort: 'low'
    });
    const finding = createFinding({
      category: 'setup',
      severity: 'high',
      description: '.env file is missing. Setup automation should generate it from .env.example.',
      evidence: env.path,
      recommendationId: recommendation.id
    });
    recommendation.relatedFindingIds.push(finding.id);
    findings.push(finding);
    recommendations.push(recommendation);
  } else {
    if (!envProjectName) {
      const recommendation = createRecommendation({
        action: 'Update .env with PROJECT_NAME matching the repository directory name',
        impact: 'DX',
        effort: 'trivial'
      });
      const finding = createFinding({
        category: 'setup',
        severity: 'medium',
        description: 'PROJECT_NAME is missing from .env. Setup script should stamp it during bootstrap.',
        evidence: env.path,
        recommendationId: recommendation.id
      });
      recommendation.relatedFindingIds.push(finding.id);
      findings.push(finding);
      recommendations.push(recommendation);
    } else if (envProjectName !== projectDirName) {
      const recommendation = createRecommendation({
        action: `Regenerate .env or update PROJECT_NAME to "${projectDirName}" to align derived URLs`,
        impact: 'DX',
        effort: 'trivial'
      });
      const finding = createFinding({
        category: 'setup',
        severity: 'medium',
        description: `PROJECT_NAME in .env ("${envProjectName}") differs from repository directory name ("${projectDirName}").`,
        evidence: env.path,
        recommendationId: recommendation.id
      });
      recommendation.relatedFindingIds.push(finding.id);
      findings.push(finding);
      recommendations.push(recommendation);
    }

    const expected = deriveExpectedHosts(env.variables);

    if (!drupalApiUrl) {
      const recommendation = createRecommendation({
        action: 'Ensure setup automation appends DRUPAL_API_URL to .env after sync',
        impact: 'correctness',
        effort: 'trivial'
      });
      const finding = createFinding({
        category: 'setup',
        severity: 'high',
        description: 'DRUPAL_API_URL is missing from .env. JSON:API clients rely on this value.',
        evidence: env.path,
        recommendationId: recommendation.id
      });
      recommendation.relatedFindingIds.push(finding.id);
      findings.push(finding);
      recommendations.push(recommendation);
    } else if (expected.expectedDrupalApiUrl && drupalApiUrl !== expected.expectedDrupalApiUrl) {
      const recommendation = createRecommendation({
        action: `Update DRUPAL_API_URL to ${expected.expectedDrupalApiUrl} or rerun ./setup.sh`,
        impact: 'correctness',
        effort: 'trivial'
      });
      const finding = createFinding({
        category: 'setup',
        severity: 'medium',
        description: `DRUPAL_API_URL (${drupalApiUrl}) does not match the derived DDEV endpoint (${expected.expectedDrupalApiUrl}).`,
        evidence: env.path,
        recommendationId: recommendation.id
      });
      recommendation.relatedFindingIds.push(finding.id);
      findings.push(finding);
      recommendations.push(recommendation);
    }

    if (expected.expectedDrupalBaseUrl && drupalBaseUrl && drupalBaseUrl !== expected.expectedDrupalBaseUrl) {
      const recommendation = createRecommendation({
        action: `Align DRUPAL_BASE_URL with ${expected.expectedDrupalBaseUrl} for local JSON:API parity`,
        impact: 'correctness',
        effort: 'low'
      });
      const finding = createFinding({
        category: 'setup',
        severity: 'low',
        description: `DRUPAL_BASE_URL (${drupalBaseUrl}) differs from expected DDEV hostname (${expected.expectedDrupalBaseUrl}).`,
        evidence: env.path,
        recommendationId: recommendation.id
      });
      recommendation.relatedFindingIds.push(finding.id);
      findings.push(finding);
      recommendations.push(recommendation);
    }
  }

  Object.values(commands).forEach((status) => {
    if (!status.found) {
      const recommendation = createRecommendation({
        action: `Install or expose the "${status.command}" CLI before running ./setup.sh`,
        impact: 'DX',
        effort: 'low'
      });
      const finding = createFinding({
        category: 'setup',
        severity: 'high',
        description: `Required command "${status.command}" is not available in PATH.`,
        evidence: 'PATH'
      });
      finding.recommendationId = recommendation.id;
      recommendation.relatedFindingIds.push(finding.id);
      findings.push(finding);
      recommendations.push(recommendation);
    }
  });

  Object.entries(pathStatusMap).forEach(([relativePath, status]) => {
    if (!status.exists) {
      const recommendation = createRecommendation({
        action: `Run ./setup.sh to create ${relativePath}`,
        impact: 'DX',
        effort: 'low'
      });
      const finding = createFinding({
        category: 'setup',
        severity: relativePath.endsWith('.toml') ? 'high' : 'medium',
        description: `${relativePath} does not exist. Setup automation should provision this artifact.`,
        evidence: status.absolutePath,
        recommendationId: recommendation.id
      });
      recommendation.relatedFindingIds.push(finding.id);
      findings.push(finding);
      recommendations.push(recommendation);
    } else if (!status.matchesType) {
      const finding = createFinding({
        category: 'setup',
        severity: 'medium',
        description: `${relativePath} exists but is not a ${status.type}.`,
        evidence: status.absolutePath
      });
      findings.push(finding);
    }
  });

  if (wranglerStatus.exists) {
    if (!wranglerStatus.hasMain) {
      const recommendation = createRecommendation({
        action: 'Update main entry in wrangler.toml to ./astro-frontend/dist/_worker.js/index.js',
        impact: 'correctness',
        effort: 'trivial'
      });
      const finding = createFinding({
        category: 'setup',
        severity: 'medium',
        description: 'wrangler.toml main entry is missing or incorrect.',
        evidence: resolveFromProjectRoot('wrangler.toml'),
        recommendationId: recommendation.id
      });
      recommendation.relatedFindingIds.push(finding.id);
      findings.push(finding);
      recommendations.push(recommendation);
    }

    if (!wranglerStatus.hasAssetsBinding) {
      const recommendation = createRecommendation({
        action: 'Add [assets] binding = "ASSETS" to wrangler.toml to expose static assets',
        impact: 'correctness',
        effort: 'trivial'
      });
      const finding = createFinding({
        category: 'setup',
        severity: 'medium',
        description: 'wrangler.toml is missing the ASSETS binding under [assets].',
        evidence: resolveFromProjectRoot('wrangler.toml'),
        recommendationId: recommendation.id
      });
      recommendation.relatedFindingIds.push(finding.id);
      findings.push(finding);
      recommendations.push(recommendation);
    }

    if (!wranglerStatus.hasSessionBinding) {
      const recommendation = createRecommendation({
        action: 'Define [[kv_namespaces]] binding "SESSION" in wrangler.toml with your namespace id',
        impact: 'reliability',
        effort: 'low'
      });
      const finding = createFinding({
        category: 'setup',
        severity: 'medium',
        description: 'wrangler.toml is missing the SESSION KV namespace binding.',
        evidence: resolveFromProjectRoot('wrangler.toml'),
        recommendationId: recommendation.id
      });
      recommendation.relatedFindingIds.push(finding.id);
      findings.push(finding);
      recommendations.push(recommendation);
    }
  }

  if (astroStatus.exists) {
    if (!astroStatus.hasServerOutput) {
      const recommendation = createRecommendation({
        action: 'Set output: "server" in astro-frontend/astro.config.mjs to enable SSR by default',
        impact: 'correctness',
        effort: 'trivial'
      });
      const finding = createFinding({
        category: 'setup',
        severity: 'medium',
        description: 'Astro config does not set output: "server".',
        evidence: resolveFromProjectRoot('astro-frontend/astro.config.mjs'),
        recommendationId: recommendation.id
      });
      recommendation.relatedFindingIds.push(finding.id);
      findings.push(finding);
      recommendations.push(recommendation);
    }

    if (!astroStatus.usesCloudflare) {
      const recommendation = createRecommendation({
        action: 'Configure @astrojs/cloudflare adapter in astro.config.mjs',
        impact: 'correctness',
        effort: 'low'
      });
      const finding = createFinding({
        category: 'setup',
        severity: 'medium',
        description: 'Astro config does not reference the Cloudflare adapter.',
        evidence: resolveFromProjectRoot('astro-frontend/astro.config.mjs'),
        recommendationId: recommendation.id
      });
      recommendation.relatedFindingIds.push(finding.id);
      findings.push(finding);
      recommendations.push(recommendation);
    }
  }

  const probeUrl = drupalBaseUrl || expectedHosts.expectedDrupalBaseUrl;
  let drupalProbe = null;

  if (probeUrl) {
    drupalProbe = await probeDrupalSite(probeUrl);

    if (drupalProbe && !drupalProbe.ok) {
      const recommendation = createRecommendation({
        action: `Start DDEV with "ddev start" and ensure ${probeUrl} is reachable`,
        impact: 'reliability',
        effort: 'low'
      });
      const finding = createFinding({
        category: 'setup',
        severity: 'medium',
        description: `Drupal site at ${probeUrl} is not reachable (${drupalProbe.statusText ?? 'unknown error'}).`,
        evidence: drupalProbe.error ?? `HTTP ${drupalProbe.status}`,
        recommendationId: recommendation.id
      });
      recommendation.relatedFindingIds.push(finding.id);
      findings.push(finding);
      recommendations.push(recommendation);
    }
  }

  const highSeverityExists = findings.some((finding) => HIGH_SEVERITY.has(finding.severity));
  const gateResults = [
    {
      gate: 'setup',
      passed: !highSeverityExists,
      details: highSeverityExists
        ? 'High severity setup findings detected. Resolve before continuing to SSR/API audits.'
        : 'Setup prerequisites satisfied.',
      timestamp: new Date().toISOString()
    }
  ];

  diagnostics.push({
    level: 'info',
    message: `Commands available: ${commandSummary.available.join(', ') || 'none'}`
  });

  if (commandSummary.missing.length > 0) {
    diagnostics.push({
      level: 'warn',
      message: `Missing commands: ${commandSummary.missing.join(', ')}`
    });
  }

  diagnostics.push({
    level: 'info',
    message: `.env present: ${env.exists}`
  });

  if (drupalProbe) {
    diagnostics.push({
      level: drupalProbe.ok ? 'info' : 'warn',
      message: `Drupal probe ${drupalProbe.ok ? 'ok' : 'failed'} (${probeUrl})`
    });
  }

  const metadata = {
    target,
    envExists: env.exists,
    projectName: envProjectName ?? expectedHosts.projectName,
    drupalProbe: drupalProbe
      ? {
          url: drupalProbe.url,
          ok: drupalProbe.ok,
          status: drupalProbe.status,
          durationMs: drupalProbe.durationMs
        }
      : null,
    missingCommands: commandSummary.missing,
    missingPaths: Object.values(pathStatusMap)
      .filter((entry) => !entry.exists)
      .map((entry) => entry.path)
  };

  return {
    target,
    findings,
    recommendations,
    gateResults,
    diagnostics,
    metadata
  };
};

export { run };
export default { run };
