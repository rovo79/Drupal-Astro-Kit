import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Extract file/path references from markdown documentation
 * Looks for common patterns: code blocks, links, file paths
 */
export const extractPathsFromMarkdown = (content) => {
  const paths = new Set();
  const urls = new Set();

  // Match file paths in code blocks and inline code
  // Patterns: `path/to/file`, ./path, /path, ../path
  const pathPatterns = [
    /`([./\w\-/_]+\.\w+)`/g, // `file.ext`
    /\[.*?\]\((.*?)\)/g, // [text](path or url)
    /`(\.\/[\w\-/_]+)`/g, // `./path`
    /`(\/[\w\-/_]+)`/g, // `/path`
    /^#+.*?([\w\-/_]+\.\w+)$/gm // # Heading mentioning file.ext
  ];

  for (const pattern of pathPatterns) {
    let match;
    // eslint-disable-next-line no-cond-assign
    while ((match = pattern.exec(content)) !== null) {
      const ref = match[1];
      if (ref && !ref.startsWith('http')) {
        paths.add(ref);
      } else if (ref?.startsWith('http')) {
        urls.add(ref);
      }
    }
  }

  // Also extract environment variable references and config keys
  const envVars = new Set();
  const envPattern = /\$\{?([\w_]+)\}?/g;
  let match;
  // eslint-disable-next-line no-cond-assign
  while ((match = envPattern.exec(content)) !== null) {
    const envVar = match[1];
    if (
      envVar &&
      envVar.length > 2 &&
      envVar === envVar.toUpperCase() &&
      !envVar.match(/^[0-9]/)
    ) {
      envVars.add(envVar);
    }
  }

  return {
    paths: Array.from(paths),
    urls: Array.from(urls),
    envVars: Array.from(envVars)
  };
};

/**
 * Verify that referenced paths exist in the repository
 */
export const verifyPaths = async (paths, baseDir) => {
  const results = {
    valid: [],
    missing: [],
    errors: []
  };

  for (const pathRef of paths) {
    try {
      // Normalize path (handle ./, /, etc.)
      let normalizedPath = pathRef;
      if (normalizedPath.startsWith('./')) {
        normalizedPath = normalizedPath.slice(2);
      }
      if (normalizedPath.startsWith('/')) {
        normalizedPath = normalizedPath.slice(1);
      }

      const fullPath = path.join(baseDir, normalizedPath);
      const stats = await fs.stat(fullPath);

      results.valid.push({
        path: pathRef,
        fullPath,
        type: stats.isDirectory() ? 'directory' : 'file'
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        results.missing.push({
          path: pathRef,
          reason: 'File or directory not found'
        });
      } else {
        results.errors.push({
          path: pathRef,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  return results;
};

/**
 * Extract configuration references from docs
 * Looks for mentions of specific config files and their expected structure
 */
export const extractConfigReferences = (content) => {
  const configs = {
    'wrangler.toml': [],
    '.env': [],
    'astro.config.mjs': [],
    'package.json': [],
    'ddev.yaml': []
  };

  // Simple pattern matching for config file mentions
  Object.keys(configs).forEach((configFile) => {
    const pattern = new RegExp(`${configFile}[^\\n]*`, 'g');
    let match;
    // eslint-disable-next-line no-cond-assign
    while ((match = pattern.exec(content)) !== null) {
      configs[configFile].push(match[0]);
    }
  });

  return configs;
};

/**
 * Find all markdown files in a directory
 */
export const findMarkdownFiles = async (docsDir) => {
  try {
    const files = await fs.readdir(docsDir);
    const mdFiles = files
      .filter((file) => file.endsWith('.md'))
      .map((file) => path.join(docsDir, file));
    return mdFiles;
  } catch (error) {
    return [];
  }
};

/**
 * Read and parse all markdown files in documentation
 */
export const scanDocumentation = async (docsDir, projectRoot) => {
  const mdFiles = await findMarkdownFiles(docsDir);
  const docAnalysis = {
    filesScanned: mdFiles.length,
    allPaths: new Set(),
    allUrls: new Set(),
    allEnvVars: new Set(),
    allConfigs: {},
    pathVerification: {
      valid: [],
      missing: [],
      errors: []
    },
    fileDetails: []
  };

  for (const filePath of mdFiles) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileName = path.basename(filePath);

      const extracted = extractPathsFromMarkdown(content);
      const configs = extractConfigReferences(content);

      // Accumulate all references
      extracted.paths.forEach((p) => docAnalysis.allPaths.add(p));
      extracted.urls.forEach((u) => docAnalysis.allUrls.add(u));
      extracted.envVars.forEach((e) => docAnalysis.allEnvVars.add(e));

      Object.entries(configs).forEach(([config, mentions]) => {
        if (mentions.length > 0) {
          if (!docAnalysis.allConfigs[config]) {
            docAnalysis.allConfigs[config] = [];
          }
          docAnalysis.allConfigs[config].push({
            file: fileName,
            mentions: mentions.length
          });
        }
      });

      docAnalysis.fileDetails.push({
        file: fileName,
        pathCount: extracted.paths.length,
        urlCount: extracted.urls.length,
        envVarCount: extracted.envVars.length
      });
    } catch (error) {
      docAnalysis.fileDetails.push({
        file: path.basename(filePath),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Convert Sets to Arrays for serialization
  const uniquePaths = Array.from(docAnalysis.allPaths);
  const verification = await verifyPaths(uniquePaths, projectRoot);

  return {
    ...docAnalysis,
    allPaths: uniquePaths,
    allUrls: Array.from(docAnalysis.allUrls),
    allEnvVars: Array.from(docAnalysis.allEnvVars),
    pathVerification: verification
  };
};

export default {
  extractPathsFromMarkdown,
  verifyPaths,
  extractConfigReferences,
  findMarkdownFiles,
  scanDocumentation
};
