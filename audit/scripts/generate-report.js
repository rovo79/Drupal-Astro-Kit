#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIT_REPORT_JSON = path.join(__dirname, '../report/audit-report.json');
const AUDIT_REPORT_MD = path.join(__dirname, '../report/audit-report.md');

/**
 * Generate markdown summary from audit report
 */
const generateMarkdownSummary = (report) => {
  const timestamp = new Date(report.generatedAt).toLocaleString();
  let md = `# Audit Report Summary\n\n`;
  md += `**Generated**: ${timestamp}\n\n`;

  // Overview
  md += `## Overview\n\n`;
  md += `| Metric | Count |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Findings | ${report.findings.length} |\n`;
  md += `| Total Recommendations | ${report.recommendations.length} |\n`;
  md += `| Audit Targets Ran | ${report.metadata.ranTargets.length} |\n`;
  md += `| High Severity | ${report.findings.filter((f) => f.severity === 'high').length} |\n`;
  md += `| Medium Severity | ${report.findings.filter((f) => f.severity === 'medium').length} |\n`;
  md += `| Low Severity | ${report.findings.filter((f) => f.severity === 'low').length} |\n`;
  md += `\n`;

  // Findings by Category
  const categoryCounts = report.findings.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] ?? 0) + 1;
    return acc;
  }, {});

  if (Object.keys(categoryCounts).length > 0) {
    md += `## Findings by Category\n\n`;
    Object.entries(categoryCounts).forEach(([category, count]) => {
      md += `- **${category}**: ${count} finding(s)\n`;
    });
    md += `\n`;
  }

  // High Severity Findings
  const highSeverity = report.findings.filter((f) => f.severity === 'high');
  if (highSeverity.length > 0) {
    md += `## 🔴 High Severity Issues\n\n`;
    highSeverity.forEach((f) => {
      md += `### ${f.category.toUpperCase()}: ${f.description}\n\n`;
      md += `**Evidence**: ${f.evidence}\n\n`;
      if (f.recommendationId) {
        const rec = report.recommendations.find((r) => r.id === f.recommendationId);
        if (rec) {
          md += `**Recommendation**: ${rec.action}\n`;
          md += `**Effort**: ${rec.effort}\n\n`;
        }
      }
    });
  }

  // Medium Severity Findings
  const mediumSeverity = report.findings.filter((f) => f.severity === 'medium');
  if (mediumSeverity.length > 0) {
    md += `## 🟡 Medium Severity Issues\n\n`;
    mediumSeverity.forEach((f) => {
      md += `### ${f.category.toUpperCase()}: ${f.description}\n\n`;
      md += `**Evidence**: ${f.evidence}\n\n`;
    });
  }

  // Collectors Summary
  md += `## Audit Targets Status\n\n`;
  report.metadata.collectors.forEach((collector) => {
    const status = collector.status === 'ok' ? '✅' : '❌';
    md += `- ${status} **${collector.target}**: ${collector.findingCount} finding(s), ${collector.recommendationCount} recommendation(s)\n`;
    if (collector.error) {
      md += `  - Error: ${collector.error}\n`;
    }
  });
  md += `\n`;

  // Next Steps
  md += `## Recommended Next Steps\n\n`;
  const criticalRecs = report.recommendations.filter((r) => r.impact === 'correctness');
  if (criticalRecs.length > 0) {
    md += `### Critical (Correctness)\n\n`;
    criticalRecs.slice(0, 3).forEach((r) => {
      md += `- ${r.action} (effort: ${r.effort})\n`;
    });
    md += `\n`;
  }

  const reliabilityRecs = report.recommendations.filter((r) => r.impact === 'reliability');
  if (reliabilityRecs.length > 0) {
    md += `### Reliability\n\n`;
    reliabilityRecs.slice(0, 3).forEach((r) => {
      md += `- ${r.action} (effort: ${r.effort})\n`;
    });
    md += `\n`;
  }

  // Footer
  md += `---\n\n`;
  md += `For detailed findings and recommendations, see the JSON report.\n`;
  md += `Last updated: ${timestamp}\n`;

  return md;
};

/**
 * Generate enhanced JSON report
 */
const enhanceReport = (report) => {
  const enhanced = { ...report };

  // Add summary statistics
  enhanced.summary = {
    findingsByCategory: report.findings.reduce((acc, f) => {
      acc[f.category] = (acc[f.category] ?? 0) + 1;
      return acc;
    }, {}),
    findingsBySeverity: report.findings.reduce((acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    }, {}),
    recommendationsByImpact: report.recommendations.reduce((acc, r) => {
      acc[r.impact] = (acc[r.impact] ?? 0) + 1;
      return acc;
    }, {}),
    collectorsStatus: report.metadata.collectors.map((c) => ({
      target: c.target,
      status: c.status,
      findings: c.findingCount,
      recommendations: c.recommendationCount
    }))
  };

  // Add gate assessment
  enhanced.gateAssessment = {
    setupGate: report.findings.filter((f) => f.category === 'setup').length === 0,
    integrationGate:
      report.findings.filter((f) => ['ssr', 'api', 'kv'].includes(f.category) && f.severity === 'high')
        .length === 0,
    deploymentGate: report.findings.filter((f) => f.category === 'ci' && f.severity === 'high').length === 0
  };

  return enhanced;
};

/**
 * Main report generation
 */
const main = async () => {
  try {
    // Read JSON report
    const jsonContent = await fs.readFile(AUDIT_REPORT_JSON, 'utf8');
    const report = JSON.parse(jsonContent);

    // Enhance report
    const enhanced = enhanceReport(report);

    // Write enhanced JSON
    await fs.writeFile(AUDIT_REPORT_JSON, `${JSON.stringify(enhanced, null, 2)}\n`, 'utf8');
    console.log(`✓ Enhanced JSON report: ${AUDIT_REPORT_JSON}`);

    // Generate markdown
    const markdown = generateMarkdownSummary(enhanced);
    await fs.writeFile(AUDIT_REPORT_MD, markdown, 'utf8');
    console.log(`✓ Markdown summary: ${AUDIT_REPORT_MD}`);

    // Print summary
    console.log(`\n📊 Report Statistics:`);
    console.log(`  - Total Findings: ${enhanced.findings.length}`);
    console.log(`  - High Severity: ${enhanced.summary.findingsBySeverity.high ?? 0}`);
    console.log(`  - Audit Targets: ${enhanced.metadata.ranTargets.length}`);
  } catch (error) {
    console.error('Report generation failed:', error.message);
    process.exitCode = 1;
  }
};

main();
