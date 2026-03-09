import * as p from '@clack/prompts';
import pc from 'picocolors';
import { execa } from 'execa';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const STEP_TEXTS = [
  { id: 'env', text: 'Syncing .env file' },
  { id: 'docker-socket', text: 'Checking Docker socket' },
  { id: 'ddev-config', text: 'Configuring DDEV' },
  { id: 'ddev-start', text: 'Starting DDEV' },
  { id: 'ddev-composer-create', text: 'Creating Drupal project with Composer' },
  { id: 'ddev-drush', text: 'Installing Drush' },
  { id: 'ddev-site-install', text: 'Installing Drupal site' },
  { id: 'configure-drupal', text: 'Configuring Drupal (Content Types, CORS)' },
  { id: 'apply-recipes', text: 'Applying Drupal recipes' },
  { id: 'astro', text: 'Setting up Astro frontend' },
  { id: 'complete', text: 'Setup Complete!' },
];

function validateProjectName(name) {
  if (!name || name.trim().length === 0) return 'Project name cannot be empty';
  if (name.includes('_')) return 'Project name cannot contain underscores (use hyphens instead)';
  if (!/^[a-z0-9-]+$/.test(name)) return 'Project name can only contain lowercase letters, numbers, and hyphens';
  return undefined;
}

function cancelAndExit(message = 'Setup cancelled.') {
  p.cancel(message);
  process.exit(0);
}

function unwrapPrompt(value) {
  if (p.isCancel(value)) {
    cancelAndExit();
  }
  return value;
}

function formatElapsed(startedAt) {
  const totalSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function firstErrorLine(error) {
  const raw = error?.message ? String(error.message) : String(error ?? 'Unknown error');
  const line = raw.split('\n').map((part) => part.trim()).find(Boolean);
  return line || 'Unknown error';
}

function toActionableError(stepId, label, error) {
  const detail = firstErrorLine(error);
  if (stepId === 'docker-socket') {
    return 'Docker is not running. Start Docker Desktop or Colima, then re-run ./setup.sh';
  }
  if (stepId === 'ddev-start') {
    return `DDEV failed to start. Try: ddev poweroff && ddev start\nDetails: ${detail}`;
  }
  if (stepId === 'ddev-composer-create') {
    return `Drupal project creation failed. Check your internet connection and try again.\nDetails: ${detail}`;
  }
  if (stepId === 'astro') {
    return `Astro dependency install failed. Try: cd astro-frontend && npm install\nDetails: ${detail}`;
  }
  return `Step failed: ${label}. Error: ${detail}`;
}

function createStepRunner(totalSteps) {
  let index = 0;
  return async (stepId, label, task) => {
    index += 1;
    const prefix = `[${index}/${totalSteps}] ${label}`;
    const spinner = p.spinner();
    const startedAt = Date.now();
    spinner.start(prefix);

    let ticker = null;
    if (typeof spinner.message === 'function') {
      ticker = setInterval(() => {
        spinner.message(`${prefix} (${formatElapsed(startedAt)})`);
      }, 1000);
    }

    try {
      const result = await task();
      if (ticker) clearInterval(ticker);
      spinner.stop(`${prefix} ${pc.green('✓')} (${formatElapsed(startedAt)})`);
      return result;
    } catch (error) {
      if (ticker) clearInterval(ticker);
      spinner.stop(`${prefix} ${pc.red('✗')} (${formatElapsed(startedAt)})`);
      throw new Error(toActionableError(stepId, label, error));
    }
  };
}

async function resolveDockerEnv() {
  const parseUnixSocketFromHost = (host) => {
    if (!host || typeof host !== 'string') return null;
    const match = host.match(/^unix:\/\/(.+)$/);
    return match ? match[1] : null;
  };

  const isDockerSocketAvailable = async (socketPath, timeoutMs = 1500) => {
    if (!socketPath) return false;
    if (!fsSync.existsSync(socketPath)) return false;
    return new Promise((resolve) => {
      const req = http.request({ socketPath, path: '/_ping', method: 'GET' }, (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      });
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        resolve(false);
      });
      req.on('error', () => resolve(false));
      req.end();
    });
  };

  if (process.env.DOCKER_HOST && process.env.DOCKER_HOST.trim() !== '') {
    const unixPath = parseUnixSocketFromHost(process.env.DOCKER_HOST.trim());
    if (unixPath) {
      if (await isDockerSocketAvailable(unixPath)) {
        return { DOCKER_HOST: process.env.DOCKER_HOST.trim(), __socketPath: unixPath };
      }
    } else {
      return { DOCKER_HOST: process.env.DOCKER_HOST.trim() };
    }
  }

  try {
    const result = await execa('colima', ['status'], { timeout: 2000, stdin: 'ignore' });
    const stdout = result.stdout || '';
    const match = stdout.match(/docker socket:\s*(\S+)/i);
    if (match && match[1]) {
      const colimaSocket = match[1].replace(/^unix:\/\//, '');
      if (await isDockerSocketAvailable(colimaSocket)) {
        return { DOCKER_HOST: `unix://${colimaSocket}`, __socketPath: colimaSocket };
      }
    }
  } catch {
  }

  try {
    const ctx = await execa('docker', ['context', 'inspect'], { timeout: 2000, stdin: 'ignore' });
    const json = JSON.parse(ctx.stdout);
    if (Array.isArray(json) && json.length > 0) {
      const host = json[0]?.Endpoints?.docker?.Host;
      const unixPath = parseUnixSocketFromHost(host);
      if (unixPath) {
        if (await isDockerSocketAvailable(unixPath)) {
          return { DOCKER_HOST: `unix://${unixPath}`, __socketPath: unixPath };
        }
      } else if (host && typeof host === 'string') {
        return { DOCKER_HOST: host };
      }
    }
  } catch {
  }

  const defaultSocket = '/var/run/docker.sock';
  if (await isDockerSocketAvailable(defaultSocket)) {
    return { DOCKER_HOST: `unix://${defaultSocket}`, __socketPath: defaultSocket };
  }

  return {};
}

async function dockerInfoWorks(extraEnv = {}) {
  try {
    await execa('docker', ['info', '--format', '{{json .ServerVersion}}'], {
      env: { ...process.env, ...extraEnv },
      timeout: 3000,
      stdin: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function runDdev(args, options) {
  try {
    return await execa('ddev', args, { ...options, stdin: 'ignore' });
  } catch (error) {
    const parts = [];
    const message = error?.message ? String(error.message) : 'Unknown error';
    const stderr = error?.stderr ? String(error.stderr).trim() : '';
    const stdout = error?.stdout ? String(error.stdout).trim() : '';
    parts.push(message);
    if (stderr) parts.push(stderr);
    if (stdout) parts.push(stdout);
    throw new Error(parts.join('\n'));
  }
}

async function checkPrerequisites() {
  p.log.step('Checking prerequisites...');

  const nodeVersion = process.versions.node;
  const nodeMajor = Number.parseInt(nodeVersion.split('.')[0], 10);
  if (Number.isNaN(nodeMajor) || nodeMajor < 20) {
    throw new Error(`Node.js 20+ is required. You have ${nodeVersion}. Install: https://nodejs.org`);
  }
  p.log.success(`Node.js ${nodeVersion} detected`);

  let dockerReachable = await dockerInfoWorks();
  if (!dockerReachable) {
    const dockerEnvCandidate = await resolveDockerEnv();
    if (dockerEnvCandidate.DOCKER_HOST) {
      dockerReachable = await dockerInfoWorks(dockerEnvCandidate);
    }
  }
  if (!dockerReachable) {
    throw new Error('Docker is not running. Start Docker Desktop or Colima, then re-run ./setup.sh');
  }
  p.log.success('Docker daemon is reachable');

  try {
    await execa('ddev', ['version'], { stdin: 'ignore' });
  } catch {
    throw new Error('DDEV is not installed. Install: https://ddev.com/get-started/');
  }
  p.log.success('DDEV detected');

  try {
    await execa('composer', ['--version'], { stdin: 'ignore' });
  } catch {
    throw new Error('Composer is not installed. Install: https://getcomposer.org/download/');
  }
  p.log.success('Composer detected');
}

async function runSetup({
  projectRoot,
  projectName,
  adminUsername,
  adminPassword,
  astroTemplate,
  enableStructuredContent,
  astroMode,
}) {
  const runStep = createStepRunner(STEP_TEXTS.length);

  const envPath = path.join(projectRoot, '.env');
  const exampleEnvPath = path.join(projectRoot, '.env.example');
  const drupalBackendPath = path.join(projectRoot, 'drupal-backend');
  const astroFrontendPath = path.join(projectRoot, 'astro-frontend');
  const dockerEnvCandidate = await resolveDockerEnv();

  await runStep('env', STEP_TEXTS[0].text, async () => {
    const envExists = await fs.access(envPath).then(() => true).catch(() => false);
    if (!envExists) {
      await fs.copyFile(exampleEnvPath, envPath);
    }

    const upsertEnvVar = (content, key, value) => {
      const line = `${key}=${value}`;
      const re = new RegExp(`^\\s*${key}\\s*=.*$`, 'm');
      if (re.test(content)) {
        return content.replace(re, line);
      }
      const needsNewline = content.length > 0 && !content.endsWith('\n');
      return `${content}${needsNewline ? '\n' : ''}${line}\n`;
    };

    let envContent = await fs.readFile(envPath, 'utf8');
    envContent = envContent.replace(/your-project-name/g, projectName);

    const drupalBaseUrl = `http://${projectName}.ddev.site`;
    const drupalJsonApiUrl = `${drupalBaseUrl}/jsonapi`;

    envContent = upsertEnvVar(envContent, 'PROJECT_NAME', projectName);
    envContent = upsertEnvVar(envContent, 'DRUPAL_BASE_URL', drupalBaseUrl);
    envContent = upsertEnvVar(envContent, 'DRUPAL_JSONAPI_URL', drupalJsonApiUrl);
    envContent = upsertEnvVar(envContent, 'DRUPAL_API_URL', drupalJsonApiUrl);
    envContent = upsertEnvVar(envContent, 'API_BASE_URL', drupalBaseUrl);
    envContent = upsertEnvVar(envContent, 'HOMEPAGE_ALIAS', '/home');
    envContent = upsertEnvVar(envContent, 'DRUPAL_ADMIN_USER', adminUsername || 'admin');
    envContent = upsertEnvVar(envContent, 'DRUPAL_ADMIN_PASS', adminPassword || 'admin');

    await fs.writeFile(envPath, envContent);
  });

  let dockerEnv = {};
  await runStep('docker-socket', STEP_TEXTS[1].text, async () => {
    const canUseDockerCLI = await dockerInfoWorks();
    if (canUseDockerCLI) {
      dockerEnv = {};
      return;
    }

    if (dockerEnvCandidate.DOCKER_HOST) {
      const canUseWithHost = await dockerInfoWorks(dockerEnvCandidate);
      if (canUseWithHost) {
        dockerEnv = { DOCKER_HOST: dockerEnvCandidate.DOCKER_HOST };
        return;
      }
    }

    throw new Error('Docker daemon is not reachable. Start Docker Desktop or Colima.');
  });

  await runStep('ddev-config', STEP_TEXTS[2].text, async () => {
    await fs.mkdir(drupalBackendPath, { recursive: true });

    try {
      await runDdev(['stop', '--unlist', projectName], {
        cwd: drupalBackendPath,
        env: { ...process.env, ...dockerEnv },
      });
    } catch {
    }

    await runDdev(
      ['config', '--project-type=drupal11', '--php-version=8.3', '--docroot=web', `--project-name=${projectName}`, '--auto'],
      {
        cwd: drupalBackendPath,
        env: { ...process.env, ...dockerEnv },
      },
    );
  });

  await runStep('ddev-start', STEP_TEXTS[3].text, async () => {
    await runDdev(['start', '-y'], {
      cwd: drupalBackendPath,
      env: { ...process.env, ...dockerEnv },
      timeout: 300000,
    });
  });

  await runStep('ddev-composer-create', STEP_TEXTS[4].text, async () => {
    const webCorePath = path.join(drupalBackendPath, 'web', 'core');
    const composerJsonPath = path.join(drupalBackendPath, 'composer.json');
    const hasDrupal = (await pathExists(webCorePath)) || (await pathExists(composerJsonPath));

    if (!hasDrupal) {
      await runDdev(['composer', 'create-project', 'drupal/recommended-project:^11', '.', '--no-interaction'], {
        cwd: drupalBackendPath,
        env: { ...process.env, ...dockerEnv },
      });
    }
  });

  await runStep('ddev-drush', STEP_TEXTS[5].text, async () => {
    try {
      await runDdev(['composer', 'require', 'drush/drush'], {
        cwd: drupalBackendPath,
        env: { ...process.env, ...dockerEnv },
      });
    } catch {
    }
  });

  await runStep('ddev-site-install', STEP_TEXTS[6].text, async () => {
    let isInstalled = false;
    try {
      await runDdev(['exec', 'drush', 'sql:query', 'SELECT count(*) FROM users LIMIT 1'], {
        cwd: drupalBackendPath,
        env: { ...process.env, ...dockerEnv },
      });
      isInstalled = true;
    } catch {
      isInstalled = false;
    }

    if (!isInstalled) {
      await runDdev(['exec', 'drush', 'site:install', `--account-name=${adminUsername}`, `--account-pass=${adminPassword}`, '-y'], {
        cwd: drupalBackendPath,
        env: { ...process.env, ...dockerEnv },
      });
    }
  });

  await runStep('configure-drupal', STEP_TEXTS[7].text, async () => {
    const recipesSrcRoot = path.join(projectRoot, 'setup', 'drupal-recipes');
    const recipesDestRoot = path.join(drupalBackendPath, 'web', 'recipes', 'dak');
    await fs.mkdir(recipesDestRoot, { recursive: true });

    const recipeDirs = [
      { name: 'dak_decoupled_base', required: true },
      { name: 'dak_starter_content', required: true },
      { name: 'dak_structured_content', required: false },
    ];

    for (const recipe of recipeDirs) {
      const src = path.join(recipesSrcRoot, recipe.name);
      const dest = path.join(recipesDestRoot, recipe.name);
      const exists = await pathExists(src);
      if (!exists) {
        if (recipe.required) {
          throw new Error(`Missing recipe source folder: ${src}`);
        }
        continue;
      }
      await copyDir(src, dest);
    }

    for (const recipe of recipeDirs.filter((item) => item.required || enableStructuredContent)) {
      const recipeYmlPath = path.join(recipesDestRoot, recipe.name, 'recipe.yml');
      if (!(await pathExists(recipeYmlPath))) {
        throw new Error(`Recipe copy failed (missing recipe.yml): ${recipeYmlPath}`);
      }
    }

    const composerRequires = ['drupal/pathauto', 'drupal/default_content'];
    if (enableStructuredContent) {
      composerRequires.push('drupal/paragraphs', 'drupal/entity_reference_revisions');
    }

    try {
      await runDdev(['composer', 'require', ...composerRequires], {
        cwd: drupalBackendPath,
        env: { ...process.env, ...dockerEnv },
      });
    } catch {
    }
  });

  await runStep('apply-recipes', STEP_TEXTS[8].text, async () => {
    const recipeName = 'dak_decoupled_base';
    const recipeCandidates = [`recipes/${recipeName}`, `web/recipes/${recipeName}`];

    const resolveRecipePath = async () => {
      for (const candidate of recipeCandidates) {
        const recipeYml = path.join(drupalBackendPath, candidate, 'recipe.yml');
        if (await pathExists(recipeYml)) {
          return candidate;
        }
      }
      return null;
    };

    const recipePath = await resolveRecipePath();
    if (!recipePath) {
      return;
    }

    const attempts = [
      {
        label: 'drush recipe:apply (path)',
        ddevArgs: ['exec', 'drush', 'recipe:apply', recipePath, '-y'],
        command: `drush recipe:apply ${recipePath} -y`,
      },
      {
        label: 'drush recipe:apply (name)',
        ddevArgs: ['exec', 'drush', 'recipe:apply', recipeName, '-y'],
        command: `drush recipe:apply ${recipeName} -y`,
      },
      {
        label: 'drush recipe (path)',
        ddevArgs: ['exec', 'drush', 'recipe', recipePath, '-y'],
        command: `drush recipe ${recipePath} -y`,
      },
      {
        label: 'drush recipe (name)',
        ddevArgs: ['exec', 'drush', 'recipe', recipeName, '-y'],
        command: `drush recipe ${recipeName} -y`,
      },
      {
        label: 'core script (path)',
        ddevArgs: ['exec', 'php', 'web/core/scripts/drupal', 'recipe', recipePath],
        command: `php web/core/scripts/drupal recipe ${recipePath}`,
      },
      {
        label: 'core script (name)',
        ddevArgs: ['exec', 'php', 'web/core/scripts/drupal', 'recipe', recipeName],
        command: `php web/core/scripts/drupal recipe ${recipeName}`,
      },
    ];

    const errors = [];
    let applied = false;

    for (const attempt of attempts) {
      try {
        await runDdev(attempt.ddevArgs, { cwd: drupalBackendPath, env: { ...process.env, ...dockerEnv } });
        applied = true;
        break;
      } catch (error) {
        errors.push(`- ${attempt.label}: Failed to execute command \`${attempt.command}\`: ${error.message}`);
      }
    }

    if (!applied) {
      try {
        await runDdev(['exec', 'drush', 'en', 'jsonapi', 'path', '-y'], {
          cwd: drupalBackendPath,
          env: { ...process.env, ...dockerEnv },
        });
        applied = true;
      } catch (error) {
        errors.push(`- drush en fallback (core): Failed to execute command \`drush en jsonapi path -y\`: ${error.message}`);
      }

      if (applied) {
        try {
          await runDdev(['exec', 'drush', 'en', 'pathauto', '-y'], {
            cwd: drupalBackendPath,
            env: { ...process.env, ...dockerEnv },
          });
        } catch (error) {
          errors.push(`- drush en fallback (optional pathauto): Failed to execute command \`drush en pathauto -y\`: ${error.message}`);
        }
      }
    }

    if (!applied) {
      throw new Error(`Failed to apply recipe "${recipeName}". Attempts:\n${errors.join('\n')}`);
    }
  });

  await runStep('astro', STEP_TEXTS[9].text, async () => {
    if (astroMode === 'skip') {
      return;
    }

    if (astroMode === 'overwrite') {
      await fs.rm(astroFrontendPath, { recursive: true, force: true });
    }

    const astroFrontendExists = await pathExists(astroFrontendPath);
    if (!astroFrontendExists) {
      await execa('npm', ['create', 'astro@latest', 'astro-frontend', '--', '--template', astroTemplate, '--yes', '--no-git'], {
        cwd: projectRoot,
        stdin: 'ignore',
      });
    }

    try {
      await execa('npm', ['install'], { cwd: astroFrontendPath, stdin: 'ignore' });
    } catch {
    }

    await execa('npm', ['install', '--save-dev', 'wrangler'], { cwd: astroFrontendPath, stdin: 'ignore' });
    await execa('npm', ['install', '--save', 'astro'], { cwd: astroFrontendPath, stdin: 'ignore' });
    await execa('npm', ['install', '--save', 'jsona', 'drupal-jsonapi-params', 'tslib@2.6.2'], {
      cwd: astroFrontendPath,
      stdin: 'ignore',
    });

    try {
      await execa('node', ['-e', "require.resolve('tslib')"], { cwd: astroFrontendPath, stdin: 'ignore' });
    } catch {
      await execa('npm', ['install', '--save', 'tslib@2.6.2'], { cwd: astroFrontendPath, stdin: 'ignore' });
    }

    const packageJsonPath = path.join(astroFrontendPath, 'package.json');
    const packageContent = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    packageJson.name = `${projectName}-frontend`;

    const engines = { ...(packageJson.engines ?? {}) };
    engines.node = '>=20 <21';
    packageJson.engines = engines;

    const deps = { ...(packageJson.dependencies ?? {}) };
    if (deps.tslib && deps.tslib !== '2.6.2') {
      deps.tslib = '2.6.2';
    } else if (!deps.tslib) {
      deps.tslib = '2.6.2';
    }
    packageJson.dependencies = deps;

    const scripts = { ...(packageJson.scripts ?? {}) };
    if (!scripts.dev) scripts.dev = 'astro dev';
    if (!scripts.start) scripts.start = scripts.dev;
    if (!scripts.build) scripts.build = 'astro build';
    if (!scripts.preview) scripts.preview = 'astro preview';
    if (!scripts.astro) scripts.astro = 'astro';
    packageJson.scripts = scripts;

    await fs.writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
    await fs.writeFile(path.join(astroFrontendPath, '.nvmrc'), '20\n');

    const astroConfigContent = `import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://${projectName}.pages.dev',
  vite: {
    build: {
      sourcemap: true
    }
  }
});
`;
    await fs.writeFile(path.join(astroFrontendPath, 'astro.config.mjs'), astroConfigContent);
    await fs.copyFile(envPath, path.join(astroFrontendPath, '.env'));

    const wranglerJsoncContent = `{
  "name": "${projectName}",
  "compatibility_date": "${new Date().toISOString().split('T')[0]}",
  "pages_build_output_dir": "./dist"
}
`;
    await fs.writeFile(path.join(astroFrontendPath, 'wrangler.jsonc'), wranglerJsoncContent);

    const templateSrcPath = path.join(projectRoot, 'templates', 'astro-src');
    const targetSrcPath = path.join(astroFrontendPath, 'src');

    try {
      await fs.access(templateSrcPath);
      const pagesDir = path.join(targetSrcPath, 'pages');
      try {
        const templatePages = await fs.readdir(pagesDir);
        for (const file of templatePages) {
          await fs.unlink(path.join(pagesDir, file)).catch(() => {});
        }
      } catch {
      }

      await copyDir(templateSrcPath, targetSrcPath);
    } catch {
    }
  });

  await runStep('complete', STEP_TEXTS[10].text, async () => {});
}

export default async function run() {
  p.intro(pc.bgCyan(pc.black(' Drupal + Astro + Cloudflare Starter Kit ')));

  await checkPrerequisites();

  const projectRoot = path.resolve(process.cwd(), '..');
  const defaultProjectName = path.basename(path.resolve(process.cwd(), '..'));
  const astroFrontendPath = path.join(projectRoot, 'astro-frontend');
  const astroExists = await pathExists(astroFrontendPath);

  const projectName = unwrapPrompt(
    await p.text({
      message: 'Project name (lowercase, hyphens only):',
      initialValue: defaultProjectName,
      validate: (value) => validateProjectName(String(value ?? '')),
    }),
  );

  const adminUsernameInput = unwrapPrompt(
    await p.text({
      message: 'Drupal admin username:',
      placeholder: 'admin',
      initialValue: 'admin',
    }),
  );
  const adminUsername = String(adminUsernameInput || 'admin');

  const adminPasswordInput = unwrapPrompt(
    await p.password({
      message: 'Drupal admin password:',
      placeholder: 'admin',
      mask: '•',
    }),
  );
  const adminPassword = String(adminPasswordInput || 'admin');

  let astroMode = 'create';
  let astroTemplate = 'basics';

  if (astroExists) {
    astroMode = unwrapPrompt(
      await p.select({
        message: 'astro-frontend already exists. How should setup proceed?',
        options: [
          { value: 'overwrite', label: 'Overwrite existing astro-frontend' },
          { value: 'skip', label: 'Skip Astro setup' },
          { value: 'cancel', label: 'Cancel setup' },
        ],
      }),
    );

    if (astroMode === 'cancel') {
      cancelAndExit('Setup cancelled. No files were changed.');
    }
  }

  if (!astroExists || astroMode === 'overwrite') {
    astroTemplate = unwrapPrompt(
      await p.select({
        message: 'Choose Astro template:',
        options: [
          { value: 'basics', label: 'Basics (minimal starter)' },
          { value: 'blog', label: 'Blog (with content collections)' },
          { value: 'portfolio', label: 'Portfolio (showcase your work)' },
          { value: 'minimal', label: 'Minimal (bare bones)' },
        ],
      }),
    );
  }

  const structuredContent = unwrapPrompt(
    await p.select({
      message: 'Enable structured content model (Paragraphs)?',
      options: [
        { value: 'no', label: 'No (recommended)' },
        { value: 'yes', label: 'Yes (add Paragraphs structured content)' },
      ],
    }),
  );
  const enableStructuredContent = structuredContent === 'yes';

  p.note(
    [
      `Project name: ${projectName}`,
      `Admin username: ${adminUsername}`,
      `Admin password: ${'•'.repeat(adminPassword.length)}`,
      `Astro mode: ${astroMode}`,
      `Astro template: ${astroMode === 'skip' ? 'n/a (skipped)' : astroTemplate}`,
      `Structured content: ${enableStructuredContent ? 'yes' : 'no'}`,
    ].join('\n'),
    'Configuration Summary',
  );

  const proceed = unwrapPrompt(
    await p.confirm({
      message: 'Proceed with setup?',
      initialValue: true,
    }),
  );

  if (!proceed) {
    cancelAndExit('Setup cancelled by user.');
  }

  try {
    await runSetup({
      projectRoot,
      projectName: String(projectName),
      adminUsername,
      adminPassword,
      astroTemplate: String(astroTemplate),
      enableStructuredContent,
      astroMode,
    });
  } catch (error) {
    p.log.error(error.message || String(error));
    throw error;
  }

  p.note(
    [
      '1. Start the Drupal backend:',
      '   cd drupal-backend && ddev launch',
      '',
      '2. Start the Astro frontend (in a new terminal from project root):',
      '   cd astro-frontend && npm run dev',
      '   (If port 4321 is in use: npm run dev -- --port 4322)',
      '',
      '3. Your sites will be available at:',
      `   Drupal: http://${projectName}.ddev.site (admin: ${adminUsername}/${adminPassword})`,
      '   Astro:  http://localhost:4321',
    ].join('\n'),
    'Next Steps',
  );

  p.outro(pc.green(`${projectName} is ready!`));
}
