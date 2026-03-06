import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import chalk from 'chalk';
import {
  AUDIT_TARGETS,
  FINDING_CATEGORIES,
  PROJECT_ROOT,
  resolveFromProjectRoot
} from './util/constants.js';

const createId = (prefix) => `${prefix}-${crypto.randomUUID()}`;

const createFinding = ({
  category = 'build',
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

/**
 * Read a file and return its contents, or null if it doesn't exist.
 */
function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Recursively collect all files under a directory.
 */
function collectFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

// Canonical env vars that the template API client should reference
const CANONICAL_ENV_VARS = [
  'DRUPAL_BASE_URL',
  'API_BASE_URL',
  'HOMEPAGE_ALIAS',
  'DRUPAL_JSONAPI_URL',
  'DRUPAL_API_URL'
];

// SSR anti-patterns that should not appear in a static-first project
const SSR_ANTI_PATTERNS = [
  { pattern: /export\s+const\s+prerender\s*=\s*false/g, label: 'export const prerender = false' },
  { pattern: /Astro\.response/g, label: 'Astro.response' },
  { pattern: /Astro\.redirect/g, label: 'Astro.redirect' }
];

/**
 * Audit the JSON:API-at-build-time contract in template source files.
 *
 * Verifies that templates/astro-src/ follows static-first patterns:
 * - drupal.ts uses build-time fetch and reads canonical env vars
 * - [...slug].astro exports getStaticPaths
 * - index.astro uses build-time data fetching
 * - No SSR anti-patterns anywhere in template source
 */
export const run = async ({ target = AUDIT_TARGETS.BUILD } = {}) => {
  const findings = [];
  const recommendations = [];
  const diagnostics = [];

  const templateRoot = resolveFromProjectRoot('templates', 'astro-src');

  // ── Guard: template directory must exist ──────────────────────────
  if (!fs.existsSync(templateRoot)) {
    findings.push(
      createFinding({
        category: 'build',
        severity: 'high',
        description: 'Build contract audit: templates/astro-src/ directory not found',
        evidence: `Expected directory at ${templateRoot}`
      })
    );
    diagnostics.push({
      level: 'error',
      message: 'Template source directory missing — skipping build contract audit'
    });
    return {
      target,
      findings,
      recommendations,
      diagnostics,
      metadata: { target, buildAuditSkipped: true, reason: 'template_dir_missing' }
    };
  }

  diagnostics.push({
    level: 'info',
    message: `Template source directory found: ${templateRoot}`
  });

  // ── 1. Check drupal.ts (API client) ──────────────────────────────
  console.log(chalk.dim('  Checking drupal.ts API client...'));

  const drupalTsPath = path.join(templateRoot, 'lib', 'drupal.ts');
  const drupalTsContent = readFileSafe(drupalTsPath);

  if (drupalTsContent === null) {
    findings.push(
      createFinding({
        category: 'build',
        severity: 'high',
        description: 'Build contract audit: templates/astro-src/lib/drupal.ts not found',
        evidence: `Expected API client at ${drupalTsPath}`
      })
    );
    recommendations.push(
      createRecommendation({
        action: 'Create templates/astro-src/lib/drupal.ts with build-time fetch functions (getAllPages, getStaticPaths support)',
        impact: 'correctness',
        effort: 'high',
        relatedFindingIds: findings.filter((f) => f.description.includes('drupal.ts not found')).map((f) => f.id)
      })
    );
  } else {
    diagnostics.push({
      level: 'info',
      message: 'drupal.ts found'
    });

    // Check for build-time fetch patterns
    const hasGetAllPages = /getAllPages/m.test(drupalTsContent);
    const hasFetch = /\bfetch\s*\(/m.test(drupalTsContent);

    if (!hasGetAllPages) {
      findings.push(
        createFinding({
          category: 'build',
          severity: 'high',
          description: 'Build contract audit: drupal.ts missing getAllPages() function',
          evidence: 'getAllPages is the primary build-time data source; not found in drupal.ts'
        })
      );
      recommendations.push(
        createRecommendation({
          action: 'Add getAllPages() function to drupal.ts that fetches all published pages from JSON:API at build time',
          impact: 'correctness',
          effort: 'medium'
        })
      );
    } else {
      diagnostics.push({
        level: 'info',
        message: 'drupal.ts exports getAllPages() — build-time fetch pattern OK'
      });
    }

    if (!hasFetch) {
      findings.push(
        createFinding({
          category: 'build',
          severity: 'medium',
          description: 'Build contract audit: drupal.ts does not use fetch()',
          evidence: 'Expected build-time fetch() calls to Drupal JSON:API'
        })
      );
    }

    // Check canonical env var usage
    const missingEnvVars = [];
    for (const envVar of CANONICAL_ENV_VARS) {
      const envPattern = new RegExp(`import\\.meta\\.env\\.${envVar}`, 'm');
      if (!envPattern.test(drupalTsContent)) {
        missingEnvVars.push(envVar);
      }
    }

    if (missingEnvVars.length > 0) {
      // Only flag as a finding if primary vars are missing
      const primaryMissing = missingEnvVars.filter((v) =>
        ['DRUPAL_BASE_URL', 'DRUPAL_JSONAPI_URL', 'HOMEPAGE_ALIAS'].includes(v)
      );
      if (primaryMissing.length > 0) {
        findings.push(
          createFinding({
            category: 'build',
            severity: 'medium',
            description: 'Build contract audit: drupal.ts missing primary env var references',
            evidence: `Primary env vars not referenced: ${primaryMissing.join(', ')}. ` +
              `All missing: ${missingEnvVars.join(', ')}`
          })
        );
        recommendations.push(
          createRecommendation({
            action: `Ensure drupal.ts reads these env vars via import.meta.env: ${primaryMissing.join(', ')}`,
            impact: 'correctness',
            effort: 'low'
          })
        );
      } else {
        diagnostics.push({
          level: 'info',
          message: `drupal.ts: back-compat env vars not referenced (optional): ${missingEnvVars.join(', ')}`
        });
      }
    } else {
      diagnostics.push({
        level: 'info',
        message: 'drupal.ts references all canonical env vars'
      });
    }
  }

  // ── 2. Check [...slug].astro ─────────────────────────────────────
  console.log(chalk.dim('  Checking [...slug].astro route...'));

  const slugAstroPath = path.join(templateRoot, 'pages', '[...slug].astro');
  const slugAstroContent = readFileSafe(slugAstroPath);

  if (slugAstroContent === null) {
    findings.push(
      createFinding({
        category: 'build',
        severity: 'high',
        description: 'Build contract audit: templates/astro-src/pages/[...slug].astro not found',
        evidence: `Expected catch-all route at ${slugAstroPath}`
      })
    );
    recommendations.push(
      createRecommendation({
        action: 'Create templates/astro-src/pages/[...slug].astro with getStaticPaths() that maps Drupal aliases to static routes',
        impact: 'correctness',
        effort: 'high',
        relatedFindingIds: findings.filter((f) => f.description.includes('[...slug].astro not found')).map((f) => f.id)
      })
    );
  } else {
    diagnostics.push({
      level: 'info',
      message: '[...slug].astro found'
    });

    // Must export getStaticPaths for static generation
    const hasGetStaticPaths = /export\s+(async\s+)?function\s+getStaticPaths/m.test(slugAstroContent);
    if (!hasGetStaticPaths) {
      findings.push(
        createFinding({
          category: 'build',
          severity: 'high',
          description: 'Build contract audit: [...slug].astro does not export getStaticPaths()',
          evidence: 'getStaticPaths() is required for Astro static generation — missing export'
        })
      );
      recommendations.push(
        createRecommendation({
          action: 'Export getStaticPaths() from [...slug].astro to enable static route generation from Drupal aliases',
          impact: 'correctness',
          effort: 'medium'
        })
      );
    } else {
      diagnostics.push({
        level: 'info',
        message: '[...slug].astro exports getStaticPaths() — static generation OK'
      });
    }

    // Flag SSR opt-out pattern
    if (/export\s+const\s+prerender\s*=\s*false/.test(slugAstroContent)) {
      findings.push(
        createFinding({
          category: 'build',
          severity: 'high',
          description: 'Build contract audit: [...slug].astro has prerender = false (SSR mode)',
          evidence: 'export const prerender = false disables static generation — violates static-first contract'
        })
      );
      recommendations.push(
        createRecommendation({
          action: 'Remove "export const prerender = false" from [...slug].astro to maintain static-first architecture',
          impact: 'correctness',
          effort: 'low'
        })
      );
    }
  }

  // ── 3. Check index.astro ─────────────────────────────────────────
  console.log(chalk.dim('  Checking index.astro homepage...'));

  const indexAstroPath = path.join(templateRoot, 'pages', 'index.astro');
  const indexAstroContent = readFileSafe(indexAstroPath);

  if (indexAstroContent === null) {
    findings.push(
      createFinding({
        category: 'build',
        severity: 'high',
        description: 'Build contract audit: templates/astro-src/pages/index.astro not found',
        evidence: `Expected homepage route at ${indexAstroPath}`
      })
    );
    recommendations.push(
      createRecommendation({
        action: 'Create templates/astro-src/pages/index.astro as the homepage route with build-time data fetching',
        impact: 'correctness',
        effort: 'medium',
        relatedFindingIds: findings.filter((f) => f.description.includes('index.astro not found')).map((f) => f.id)
      })
    );
  } else {
    diagnostics.push({
      level: 'info',
      message: 'index.astro found'
    });

    // Check for build-time data fetching patterns
    const hasGetAllPages = /getAllPages/m.test(indexAstroContent);
    const hasAwait = /await\s+/m.test(indexAstroContent);
    const importsDrupal = /from\s+['"]\.\.\/lib\/drupal/m.test(indexAstroContent);

    if (!importsDrupal) {
      findings.push(
        createFinding({
          category: 'build',
          severity: 'medium',
          description: 'Build contract audit: index.astro does not import from drupal.ts',
          evidence: 'Homepage should import API client for build-time data fetching'
        })
      );
    }

    if (!hasGetAllPages && !hasAwait) {
      findings.push(
        createFinding({
          category: 'build',
          severity: 'medium',
          description: 'Build contract audit: index.astro lacks build-time data fetching',
          evidence: 'No getAllPages() call or await expression found — homepage may not fetch Drupal content at build time'
        })
      );
      recommendations.push(
        createRecommendation({
          action: 'Add build-time data fetching to index.astro using getAllPages() from drupal.ts',
          impact: 'correctness',
          effort: 'low'
        })
      );
    } else {
      diagnostics.push({
        level: 'info',
        message: 'index.astro uses build-time data fetching — OK'
      });
    }
  }

  // ── 4. Scan ALL template files for SSR anti-patterns ─────────────
  console.log(chalk.dim('  Scanning templates for SSR anti-patterns...'));

  const allTemplateFiles = collectFiles(templateRoot);
  let ssrAntiPatternCount = 0;

  for (const filePath of allTemplateFiles) {
    const content = readFileSafe(filePath);
    if (content === null) continue;

    const relPath = path.relative(PROJECT_ROOT, filePath);

    for (const { pattern, label } of SSR_ANTI_PATTERNS) {
      // Reset regex lastIndex for global patterns
      pattern.lastIndex = 0;
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        ssrAntiPatternCount += matches.length;
        findings.push(
          createFinding({
            category: 'build',
            severity: 'high',
            description: `Build contract audit: SSR anti-pattern found in ${relPath}`,
            evidence: `"${label}" detected ${matches.length} time(s) — violates static-first contract`
          })
        );
      }
    }
  }

  if (ssrAntiPatternCount === 0) {
    diagnostics.push({
      level: 'info',
      message: `Scanned ${allTemplateFiles.length} template file(s) — no SSR anti-patterns found`
    });
  } else {
    recommendations.push(
      createRecommendation({
        action: 'Remove all SSR anti-patterns (prerender=false, Astro.response, Astro.redirect) from template source files',
        impact: 'correctness',
        effort: 'low',
        relatedFindingIds: findings.filter((f) => f.description.includes('SSR anti-pattern')).map((f) => f.id)
      })
    );
  }

  // ── 5. Verify env var consistency ────────────────────────────────
  console.log(chalk.dim('  Checking env var consistency across templates...'));

  const envVarPattern = /import\.meta\.env\.(\w+)/g;
  const envVarsByFile = new Map();

  for (const filePath of allTemplateFiles) {
    const content = readFileSafe(filePath);
    if (content === null) continue;

    const relPath = path.relative(PROJECT_ROOT, filePath);
    const foundVars = new Set();
    envVarPattern.lastIndex = 0;
    for (let match = envVarPattern.exec(content); match !== null; match = envVarPattern.exec(content)) {
      foundVars.add(match[1]);
    }
    if (foundVars.size > 0) {
      envVarsByFile.set(relPath, foundVars);
    }
  }

  // Collect all env vars used across templates
  const allUsedEnvVars = new Set();
  for (const vars of envVarsByFile.values()) {
    for (const v of vars) {
      allUsedEnvVars.add(v);
    }
  }

  // Check for non-canonical env var usage (vars not in our canonical list
  // and not standard Astro env vars)
  const standardAstroVars = ['BASE_URL', 'MODE', 'DEV', 'PROD', 'SSR', 'SITE'];
  const nonCanonicalVars = [...allUsedEnvVars].filter(
    (v) => !CANONICAL_ENV_VARS.includes(v) && !standardAstroVars.includes(v)
  );

  if (nonCanonicalVars.length > 0) {
    findings.push(
      createFinding({
        category: 'build',
        severity: 'low',
        description: 'Build contract audit: non-canonical env vars used in templates',
        evidence: `Env vars not in canonical set: ${nonCanonicalVars.join(', ')}. ` +
          `This may indicate undocumented configuration.`
      })
    );
    recommendations.push(
      createRecommendation({
        action: `Document or consolidate non-canonical env vars: ${nonCanonicalVars.join(', ')}`,
        impact: 'DX',
        effort: 'low'
      })
    );
  } else {
    diagnostics.push({
      level: 'info',
      message: `All env vars in templates are canonical or standard Astro vars`
    });
  }

  // ── Summary ──────────────────────────────────────────────────────
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const mediumCount = findings.filter((f) => f.severity === 'medium').length;
  const lowCount = findings.filter((f) => f.severity === 'low').length;

  diagnostics.push({
    level: 'info',
    message: `Build contract summary: ${findings.length} finding(s) [${highCount} high, ${mediumCount} medium, ${lowCount} low], ${allTemplateFiles.length} file(s) scanned`
  });

  if (findings.length === 0) {
    diagnostics.push({
      level: 'info',
      message: 'Build contract validation PASS: static-first contract intact'
    });
  }

  return {
    target,
    findings,
    recommendations,
    diagnostics,
    metadata: {
      target,
      templateRoot: path.relative(PROJECT_ROOT, templateRoot),
      filesScanned: allTemplateFiles.length,
      envVarsFound: [...allUsedEnvVars],
      ssrAntiPatternCount,
      checks: {
        drupalTsExists: drupalTsContent !== null,
        slugAstroExists: slugAstroContent !== null,
        indexAstroExists: indexAstroContent !== null,
        hasGetStaticPaths: slugAstroContent !== null && /export\s+(async\s+)?function\s+getStaticPaths/m.test(slugAstroContent),
        hasGetAllPages: drupalTsContent !== null && /getAllPages/m.test(drupalTsContent),
        hasBuildTimeFetch: indexAstroContent !== null && /getAllPages|await\s+/m.test(indexAstroContent)
      }
    }
  };
};

export default run;
