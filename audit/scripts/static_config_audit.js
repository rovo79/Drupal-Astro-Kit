import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import {
  AUDIT_TARGETS,
  PROJECT_ROOT,
  resolveFromProjectRoot
} from './util/constants.js';

const createId = (prefix) => `${prefix}-${crypto.randomUUID()}`;

const createFinding = ({
  category = 'static',
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
  impact = 'correctness',
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

async function readFileSafe(filePath) {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

async function dirExists(dirPath) {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function findFiles(dir, extensions) {
  const results = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await findFiles(fullPath, extensions)));
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  } catch {
    // non-readable directory — skip
  }
  return results;
}

const SSR_ADAPTER_PACKAGES = [
  '@astrojs/cloudflare',
  '@astrojs/node',
  '@astrojs/vercel',
  '@astrojs/netlify'
];

const SSR_PATTERNS = [
  { regex: /export\s+const\s+prerender\s*=\s*false/g, label: 'export const prerender = false' },
  { regex: /Astro\.response/g, label: 'Astro.response' },
  { regex: /Astro\.redirect/g, label: 'Astro.redirect' }
];

/**
 * Audit static configuration — verifies Astro is configured for static output (no SSR).
 */
export const run = async ({ target = AUDIT_TARGETS.STATIC } = {}) => {
  const findings = [];
  const recommendations = [];
  const diagnostics = [];

  const astroFrontendDir = resolveFromProjectRoot('astro-frontend');
  const templateSrcDir = resolveFromProjectRoot('templates', 'astro-src');
  let checksRun = 0;
  let issuesFound = 0;

  // ─── Check 1: Astro config output mode ──────────────────────────────
  console.log(chalk.dim('  Checking Astro config output mode...'));

  const astroConfigPath = path.join(astroFrontendDir, 'astro.config.mjs');
  const astroConfigContent = await readFileSafe(astroConfigPath);

  if (astroConfigContent === null) {
    const frontendExists = await dirExists(astroFrontendDir);

    if (!frontendExists) {
      findings.push(
        createFinding({
          category: 'static',
          severity: 'info',
          description: 'Static config audit: astro-frontend/ directory not found',
          evidence:
            'The generated astro-frontend/ directory does not exist. Run setup.sh to generate it. Template source in templates/astro-src/ will still be checked.'
        })
      );

      diagnostics.push({
        level: 'info',
        message: 'astro-frontend/ not found — skipping generated-project checks'
      });
    } else {
      findings.push(
        createFinding({
          category: 'static',
          severity: 'medium',
          description: 'Static config audit: astro.config.mjs not found in astro-frontend/',
          evidence: `Expected config at ${astroConfigPath} but file does not exist`
        })
      );

      recommendations.push(
        createRecommendation({
          action:
            'Create astro.config.mjs in astro-frontend/ with output: "static" (or omit output key for default static mode)',
          impact: 'correctness',
          effort: 'low',
          relatedFindingIds: findings
            .filter((f) => f.description.includes('astro.config.mjs not found'))
            .map((f) => f.id)
        })
      );
    }
  } else {
    checksRun += 1;

    const serverMatch = astroConfigContent.match(/output\s*:\s*['"]server['"]/);
    const hybridMatch = astroConfigContent.match(/output\s*:\s*['"]hybrid['"]/);
    const staticMatch = astroConfigContent.match(/output\s*:\s*['"]static['"]/);

    if (serverMatch) {
      issuesFound += 1;
      findings.push(
        createFinding({
          category: 'static',
          severity: 'high',
          description: 'Static config audit: Astro configured for SSR server mode',
          evidence: `Found output: 'server' in ${astroConfigPath}. This kit is static-first — SSR requires a runtime adapter and breaks the static deployment model.`
        })
      );

      recommendations.push(
        createRecommendation({
          action:
            'Change output to "static" (or remove the output key entirely) in astro.config.mjs to restore static-first behavior',
          impact: 'correctness',
          effort: 'low',
          relatedFindingIds: findings
            .filter((f) => f.description.includes('SSR server mode'))
            .map((f) => f.id)
        })
      );
    } else if (hybridMatch) {
      issuesFound += 1;
      findings.push(
        createFinding({
          category: 'static',
          severity: 'high',
          description: 'Static config audit: Astro configured for hybrid mode',
          evidence: `Found output: 'hybrid' in ${astroConfigPath}. Hybrid mode requires an SSR adapter for non-prerendered routes, which conflicts with static-first deployment.`
        })
      );

      recommendations.push(
        createRecommendation({
          action:
            'Change output to "static" (or remove the output key entirely) in astro.config.mjs unless SSR routes are intentionally required',
          impact: 'correctness',
          effort: 'low',
          relatedFindingIds: findings
            .filter((f) => f.description.includes('hybrid mode'))
            .map((f) => f.id)
        })
      );
    } else if (staticMatch) {
      diagnostics.push({
        level: 'info',
        message: 'Astro config explicitly sets output: "static" — correct'
      });
    } else {
      diagnostics.push({
        level: 'info',
        message:
          'Astro config has no output key — defaults to static mode (correct)'
      });
    }
  }

  // ─── Check 2: SSR adapter packages in package.json ──────────────────
  console.log(chalk.dim('  Checking for SSR adapter packages...'));

  const packageJsonPath = path.join(astroFrontendDir, 'package.json');
  const packageJsonContent = await readFileSafe(packageJsonPath);

  if (packageJsonContent !== null) {
    checksRun += 1;

    try {
      const pkg = JSON.parse(packageJsonContent);
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {})
      };

      const foundAdapters = SSR_ADAPTER_PACKAGES.filter(
        (adapter) => adapter in allDeps
      );

      if (foundAdapters.length > 0) {
        issuesFound += 1;
        const finding = createFinding({
          category: 'static',
          severity: 'high',
          description: `Static config audit: SSR adapter package(s) found in package.json`,
          evidence: `Found SSR adapters: ${foundAdapters.join(', ')}. These are unnecessary for static output and may indicate an SSR configuration.`
        });
        findings.push(finding);

        recommendations.push(
          createRecommendation({
            action: `Remove SSR adapter packages (${foundAdapters.join(', ')}) from package.json — they are not needed for static output`,
            impact: 'correctness',
            effort: 'low',
            relatedFindingIds: [finding.id]
          })
        );
      } else {
        diagnostics.push({
          level: 'info',
          message: 'No SSR adapter packages found in package.json — correct'
        });
      }
    } catch (parseError) {
      diagnostics.push({
        level: 'warn',
        message: `Failed to parse package.json: ${parseError instanceof Error ? parseError.message : String(parseError)}`
      });
    }
  } else {
    diagnostics.push({
      level: 'info',
      message:
        'astro-frontend/package.json not found — skipping adapter check'
    });
  }

  // ─── Check 3: SSR patterns in template source ──────────────────────
  console.log(chalk.dim('  Scanning template source for SSR patterns...'));

  const templateExists = await dirExists(templateSrcDir);

  if (templateExists) {
    checksRun += 1;

    const templateFiles = await findFiles(templateSrcDir, [
      '.astro',
      '.ts',
      '.js',
      '.tsx',
      '.jsx'
    ]);

    diagnostics.push({
      level: 'info',
      message: `Found ${templateFiles.length} template source file(s) to scan`
    });

    const ssrHits = [];

    for (const filePath of templateFiles) {
      const content = await readFileSafe(filePath);
      if (!content) continue;

      const relativePath = path.relative(PROJECT_ROOT, filePath);

      for (const pattern of SSR_PATTERNS) {
        const matches = content.match(pattern.regex);
        if (matches) {
          ssrHits.push({
            file: relativePath,
            pattern: pattern.label,
            count: matches.length
          });
        }
      }
    }

    if (ssrHits.length > 0) {
      issuesFound += 1;
      const evidenceLines = ssrHits.map(
        (hit) => `  ${hit.file}: ${hit.pattern} (${hit.count}x)`
      );
      const finding = createFinding({
        category: 'static',
        severity: 'medium',
        description:
          'Static config audit: SSR patterns found in template source',
        evidence: `Found SSR-only patterns in templates/astro-src/:\n${evidenceLines.join('\n')}`
      });
      findings.push(finding);

      recommendations.push(
        createRecommendation({
          action:
            'Remove or guard SSR-only patterns (prerender = false, Astro.response, Astro.redirect) from template source files — these require an SSR adapter to function',
          impact: 'correctness',
          effort: 'medium',
          relatedFindingIds: [finding.id]
        })
      );
    } else {
      diagnostics.push({
        level: 'info',
        message:
          'No SSR patterns found in template source — correct for static output'
      });
    }
  } else {
    findings.push(
      createFinding({
        category: 'static',
        severity: 'high',
        description:
          'Static config audit: templates/astro-src/ directory not found',
        evidence: `Expected template source directory at ${templateSrcDir} but it does not exist. This is the source of truth for Astro templates.`
      })
    );

    diagnostics.push({
      level: 'error',
      message: 'Template source directory missing — cannot scan for SSR patterns'
    });
  }

  // ─── Summary ────────────────────────────────────────────────────────
  const allStatic = issuesFound === 0 && checksRun > 0;

  diagnostics.push({
    level: 'info',
    message: `Static config summary: ${checksRun} check(s) run, ${issuesFound} issue(s) found, ${findings.length} finding(s) total`
  });

  if (allStatic) {
    diagnostics.push({
      level: 'info',
      message:
        'Static config validation PASS: Astro is configured for static output with no SSR indicators'
    });
  }

  return {
    target,
    findings,
    recommendations,
    diagnostics,
    metadata: {
      target,
      checksRun,
      issuesFound,
      findingsCount: findings.length,
      astroConfigExists: astroConfigContent !== null,
      packageJsonExists: packageJsonContent !== null,
      templateSourceExists: templateExists
    }
  };
};

export default run;
