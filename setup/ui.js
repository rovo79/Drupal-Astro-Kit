'use strict';

module.exports = ({
    React,
    ink,
    Spinner,
    TextInput,
    SelectInput,
    execa,
    fs,
    path
}) => {
    const {Text, Box} = ink;
    const {useState, useEffect} = React;

    // Validation helpers
    const validateProjectName = (name) => {
        if (!name || name.trim().length === 0) return 'Project name cannot be empty';
        if (name.includes('_')) return 'Project name cannot contain underscores (use hyphens instead)';
        if (!/^[a-z0-9-]+$/.test(name)) return 'Project name can only contain lowercase letters, numbers, and hyphens';
        return null;
    };

    const Step = ({text, inProgress, done, error}) => {
        const contents = [];
        if (inProgress) contents.push(React.createElement(Spinner, {type: 'dots', key: 'spinner'}));
        if (done && !error) contents.push('✅');
        if (error) contents.push('❌');
        contents.push(' ');
        contents.push(text);
        return React.createElement(Box, null, React.createElement(Text, null, ...contents));
    };

    const App = () => {
        // Phase management
        const [phase, setPhase] = useState('welcome'); // welcome -> prompts -> setup -> complete
        
        // User inputs
        const [projectName, setProjectName] = useState(path.basename(path.resolve(process.cwd(), '..')));
        const [projectNameError, setProjectNameError] = useState(null);
        const [adminUsername, setAdminUsername] = useState('admin');
        const [adminPassword, setAdminPassword] = useState('admin');
        const [astroTemplate, setAstroTemplate] = useState('basics');
        const [enableStructuredContent, setEnableStructuredContent] = useState(false);
        const [astroExists, setAstroExists] = useState(false);

        // Check for existing astro-frontend
        useEffect(() => {
            const checkAstro = async () => {
                const projectRoot = path.resolve(process.cwd(), '..');
                const afPath = path.join(projectRoot, 'astro-frontend');
                try {
                    await fs.access(afPath);
                    setAstroExists(true);
                } catch {
                    setAstroExists(false);
                }
            };
            checkAstro();
        }, []);
        
        // Current prompt step
        const [promptStep, setPromptStep] = useState(0);
        
        // Setup steps
        const [steps, setSteps] = useState([
            {id: 'env', text: 'Syncing .env file', inProgress: false, done: false, error: null},
            {id: 'docker-socket', text: 'Checking Docker socket', inProgress: false, done: false, error: null},
            {id: 'ddev-config', text: 'Configuring DDEV', inProgress: false, done: false, error: null},
            {id: 'ddev-start', text: 'Starting DDEV', inProgress: false, done: false, error: null},
            {id: 'ddev-composer-create', text: 'Creating Drupal project with Composer', inProgress: false, done: false, error: null},
            {id: 'ddev-drush', text: 'Installing Drush', inProgress: false, done: false, error: null},
            {id: 'ddev-site-install', text: 'Installing Drupal site', inProgress: false, done: false, error: null},
            {id: 'apply-recipes', text: 'Applying Drupal recipes', inProgress: false, done: false, error: null},
            {id: 'configure-drupal', text: 'Configuring Drupal (Content Types, CORS)', inProgress: false, done: false, error: null},
            {id: 'astro', text: 'Setting up Astro frontend', inProgress: false, done: false, error: null},
            {id: 'complete', text: 'Setup Complete!', inProgress: false, done: false, error: null}
        ]);
        const [failedMessage, setFailedMessage] = useState(null);
        const [showNextSteps, setShowNextSteps] = useState(false);

        const updateStep = (id, updates) => {
            setSteps(prevSteps =>
                prevSteps.map(step => (step.id === id ? {...step, ...updates} : step))
            );
        };

        const markError = message => {
            setSteps(prevSteps =>
                prevSteps.map(step =>
                    step.inProgress ? {...step, inProgress: false, error: message} : step
                )
            );
            setFailedMessage(message || 'Setup failed. See previous step for details.');
        };

        // Handle prompt navigation
        const handleProjectNameSubmit = (value) => {
            const error = validateProjectName(value);
            if (error) {
                setProjectNameError(error);
            } else {
                setProjectName(value);
                setProjectNameError(null);
                setPromptStep(1);
            }
        };

        const handleAdminUsernameSubmit = (value) => {
            setAdminUsername(value || 'admin');
            setPromptStep(2);
        };

        const handleAdminPasswordSubmit = (value) => {
            setAdminPassword(value || 'admin');
            if (astroExists) {
                setPromptStep(4);
                return;
            }
            setPromptStep(3);
        };

        const handleTemplateSelect = (item) => {
            setAstroTemplate(item.value);
            setPromptStep(4);
        };

        const handleStructuredContentSelect = (item) => {
            setEnableStructuredContent(item.value === 'yes');
            setPhase('setup');
        };

        // Setup execution (same as before, but uses user-provided values)
        useEffect(() => {
            if (phase !== 'setup') return;

            setShowNextSteps(false);

            const resolveDockerEnv = async () => {
                const fsSync = require('node:fs');
                const http = require('node:http');

                const parseUnixSocketFromHost = (host) => {
                    if (!host || typeof host !== 'string') return null;
                    const m = host.match(/^unix:\/\/(.+)$/);
                    return m ? m[1] : null;
                };

                const isDockerSocketAvailable = async (socketPath, timeoutMs = 1500) => {
                    if (!socketPath) return false;
                    if (!fsSync.existsSync(socketPath)) return false;
                    return new Promise((resolve) => {
                        const req = http.request({ socketPath, path: '/_ping', method: 'GET' }, (res) => {
                            res.resume();
                            resolve(res.statusCode === 200);
                        });
                        req.setTimeout(timeoutMs, () => { req.destroy(); resolve(false); });
                        req.on('error', () => resolve(false));
                        req.end();
                    });
                };

                if (process.env.DOCKER_HOST && process.env.DOCKER_HOST.trim() !== '') {
                    const unixPath = parseUnixSocketFromHost(process.env.DOCKER_HOST.trim());
                    if (unixPath) {
                        if (await isDockerSocketAvailable(unixPath)) {
                            return {DOCKER_HOST: process.env.DOCKER_HOST.trim(), __socketPath: unixPath};
                        }
                    } else {
                        return {DOCKER_HOST: process.env.DOCKER_HOST.trim()};
                    }
                }

                try {
                    const result = await execa('colima', ['status'], {timeout: 2000, stdin: 'ignore'});
                    const stdout = result.stdout || '';
                    const match = stdout.match(/docker socket:\s*(\S+)/i);
                    if (match && match[1]) {
                        const colimaSocket = match[1].replace(/^unix:\/\//, '');
                        if (await isDockerSocketAvailable(colimaSocket)) {
                            return {DOCKER_HOST: `unix://${colimaSocket}` , __socketPath: colimaSocket};
                        }
                    }
                } catch (e) {}

                try {
                    const ctx = await execa('docker', ['context', 'inspect'], {timeout: 2000, stdin: 'ignore'});
                    const json = JSON.parse(ctx.stdout);
                    if (Array.isArray(json) && json.length > 0) {
                        const host = json[0]?.Endpoints?.docker?.Host;
                        const unixPath = parseUnixSocketFromHost(host);
                        if (unixPath) {
                            if (await isDockerSocketAvailable(unixPath)) {
                                return {DOCKER_HOST: `unix://${unixPath}`, __socketPath: unixPath};
                            }
                        } else if (host && typeof host === 'string') {
                            return {DOCKER_HOST: host};
                        }
                    }
                } catch (e) {}

                const defaultSocket = '/var/run/docker.sock';
                if (await isDockerSocketAvailable(defaultSocket)) {
                    return {DOCKER_HOST: `unix://${defaultSocket}`, __socketPath: defaultSocket};
                }

                return {};
            };

            const dockerInfoWorks = async (extraEnv = {}) => {
                try {
                    await execa('docker', ['info', '--format', '{{json .ServerVersion}}'], {
                        env: {...process.env, ...extraEnv},
                        timeout: 3000,
                        stdin: 'ignore'
                    });
                    return true;
                } catch {
                    return false;
                }
            };

            const pathExists = async (p) => {
                try { await fs.access(p); return true; } catch { return false; }
            };

            const copyDir = async (src, dest) => {
                await fs.mkdir(dest, {recursive: true});
                const entries = await fs.readdir(src, {withFileTypes: true});
                for (const entry of entries) {
                    const srcPath = path.join(src, entry.name);
                    const destPath = path.join(dest, entry.name);
                    if (entry.isDirectory()) {
                        await copyDir(srcPath, destPath);
                    } else {
                        await fs.copyFile(srcPath, destPath);
                    }
                }
            };

            const runDdev = async (args, options) => {
                try {
                    return await execa('ddev', args, {...options, stdin: 'ignore'});
                } catch (error) {
                    const errMsg = (error && (error.stderr || error.stdout || error.message)) || 'Unknown error';
                    throw new Error(errMsg);
                }
            };

            const runSetup = async () => {
                try {
                    const projectRoot = path.resolve(process.cwd(), '..');
                    const envPath = path.join(projectRoot, '.env');
                    const exampleEnvPath = path.join(projectRoot, '.env.example');
                    const dockerEnvCandidate = await resolveDockerEnv();

                    updateStep('env', {inProgress: true});
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
                    // Back-compat for older scripts and audits.
                    envContent = upsertEnvVar(envContent, 'DRUPAL_API_URL', drupalJsonApiUrl);
                    // Astro templates fetch from this at build time.
                    envContent = upsertEnvVar(envContent, 'API_BASE_URL', drupalBaseUrl);
                    envContent = upsertEnvVar(envContent, 'HOMEPAGE_ALIAS', '/home');
                    envContent = upsertEnvVar(envContent, 'DRUPAL_ADMIN_USER', adminUsername || 'admin');
                    envContent = upsertEnvVar(envContent, 'DRUPAL_ADMIN_PASS', adminPassword || 'admin');

                    await fs.writeFile(envPath, envContent);
                    updateStep('env', {inProgress: false, done: true});

                    updateStep('docker-socket', {inProgress: true});
                    let dockerEnv = {};
                    const canUseDockerCLI = await dockerInfoWorks();
                    if (canUseDockerCLI) {
                        dockerEnv = {};
                        updateStep('docker-socket', {inProgress: false, done: true});
                    } else if (dockerEnvCandidate.DOCKER_HOST) {
                        const canUseWithHost = await dockerInfoWorks(dockerEnvCandidate);
                        if (canUseWithHost) {
                            dockerEnv = {DOCKER_HOST: dockerEnvCandidate.DOCKER_HOST};
                            updateStep('docker-socket', {inProgress: false, done: true});
                        } else {
                            const hint = 'Docker daemon is not reachable. Start Docker Desktop or Colima.';
                            updateStep('docker-socket', {inProgress: false, error: hint});
                            markError(hint);
                            return;
                        }
                    } else {
                        const hint = 'Docker daemon is not reachable. Start Docker Desktop or Colima.';
                        updateStep('docker-socket', {inProgress: false, error: hint});
                        markError(hint);
                        return;
                    }

                    updateStep('ddev-config', {inProgress: true});
                    const drupalBackendPath = path.join(projectRoot, 'drupal-backend');
                    await fs.mkdir(drupalBackendPath, {recursive: true});
                    
                    // Remove any stale DDEV project with same name but different path
                    try {
                        await runDdev(['stop', '--unlist', projectName], {cwd: drupalBackendPath, env: {...process.env, ...dockerEnv}});
                    } catch (e) {
                        // Ignore if project doesn't exist
                    }
                    
                    await runDdev(['config', '--project-type=drupal11', '--php-version=8.3', '--docroot=web', `--project-name=${projectName}`, '--auto'], {cwd: drupalBackendPath, env: {...process.env, ...dockerEnv}});
                    updateStep('ddev-config', {inProgress: false, done: true});
                    
                    updateStep('ddev-start', {inProgress: true});
                    await runDdev(['start', '-y'], {cwd: drupalBackendPath, env: {...process.env, ...dockerEnv}, timeout: 300000});
                    updateStep('ddev-start', {inProgress: false, done: true});

                    const webCorePath = path.join(drupalBackendPath, 'web', 'core');
                    const composerJsonPath = path.join(drupalBackendPath, 'composer.json');
                    const hasDrupal = await pathExists(webCorePath) || await pathExists(composerJsonPath);
                    if (!hasDrupal) {
                        updateStep('ddev-composer-create', {inProgress: true});
                        await runDdev(['composer', 'create-project', 'drupal/recommended-project:^11', '.', '--no-interaction'], {cwd: drupalBackendPath, env: {...process.env, ...dockerEnv}});
                        updateStep('ddev-composer-create', {inProgress: false, done: true});
                    } else {
                        updateStep('ddev-composer-create', {inProgress: false, done: true});
                    }

                    updateStep('ddev-drush', {inProgress: true});
                    try {
                        await runDdev(['composer', 'require', 'drush/drush'], {cwd: drupalBackendPath, env: {...process.env, ...dockerEnv}});
                    } catch (e) {}
                    updateStep('ddev-drush', {inProgress: false, done: true});

                    updateStep('ddev-site-install', {inProgress: true});
                    let isInstalled = false;
                    try {
                        // Check if Drupal is already installed by querying the users table
                        await runDdev(['exec', 'drush', 'sql:query', 'SELECT count(*) FROM users LIMIT 1'], {cwd: drupalBackendPath, env: {...process.env, ...dockerEnv}});
                        isInstalled = true;
                    } catch (e) {
                        isInstalled = false;
                    }

                    if (!isInstalled) {
                        await runDdev(['exec', 'drush', 'site:install', `--account-name=${adminUsername}`, `--account-pass=${adminPassword}`, '-y'], {cwd: drupalBackendPath, env: {...process.env, ...dockerEnv}});
                    }
                    updateStep('ddev-site-install', {inProgress: false, done: true});

                    updateStep('configure-drupal', {inProgress: true});

                    const recipesSrcRoot = path.join(projectRoot, 'setup', 'drupal-recipes');
                    const recipesDestRoot = path.join(drupalBackendPath, 'recipes');
                    await fs.mkdir(recipesDestRoot, {recursive: true});

                    const recipeDirs = [
                        {name: 'dak_decoupled_base', required: true},
                        {name: 'dak_starter_content', required: true},
                        {name: 'dak_structured_content', required: false}
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

                    const composerRequires = ['drupal/pathauto', 'drupal/default_content'];
                    if (enableStructuredContent) {
                        composerRequires.push('drupal/paragraphs', 'drupal/entity_reference_revisions');
                    }

                    try {
                        await runDdev(['composer', 'require', ...composerRequires], {cwd: drupalBackendPath, env: {...process.env, ...dockerEnv}});
                    } catch (e) {
                        // Proceed even if this fails (e.g. if already exists)
                    }

                    updateStep('apply-recipes', {inProgress: true});
                    const recipeName = 'dak_decoupled_base';
                    const recipeCandidates = [
                        `recipes/${recipeName}`,
                        `web/recipes/${recipeName}`
                    ];

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
                        updateStep('apply-recipes', {inProgress: false, done: true});
                    } else {
                        const attempts = [
                            {
                                label: 'drush recipe:apply (path)',
                                ddevArgs: ['exec', 'drush', 'recipe:apply', recipePath, '-y'],
                                command: `drush recipe:apply ${recipePath} -y`
                            },
                            {
                                label: 'drush recipe:apply (name)',
                                ddevArgs: ['exec', 'drush', 'recipe:apply', recipeName, '-y'],
                                command: `drush recipe:apply ${recipeName} -y`
                            },
                            {
                                label: 'drush recipe (path)',
                                ddevArgs: ['exec', 'drush', 'recipe', recipePath, '-y'],
                                command: `drush recipe ${recipePath} -y`
                            },
                            {
                                label: 'drush recipe (name)',
                                ddevArgs: ['exec', 'drush', 'recipe', recipeName, '-y'],
                                command: `drush recipe ${recipeName} -y`
                            },
                            {
                                label: 'core script (path)',
                                ddevArgs: ['exec', 'php', 'web/core/scripts/drupal', 'recipe', recipePath],
                                command: `php web/core/scripts/drupal recipe ${recipePath}`
                            },
                            {
                                label: 'core script (name)',
                                ddevArgs: ['exec', 'php', 'web/core/scripts/drupal', 'recipe', recipeName],
                                command: `php web/core/scripts/drupal recipe ${recipeName}`
                            }
                        ];

                        const errors = [];
                        let applied = false;

                        for (const attempt of attempts) {
                            try {
                                await runDdev(attempt.ddevArgs, {cwd: drupalBackendPath, env: {...process.env, ...dockerEnv}});
                                applied = true;
                                break;
                            } catch (e) {
                                errors.push(`- ${attempt.label}: Failed to execute command \`${attempt.command}\`: ${e.message}`);
                            }
                        }

                        if (!applied) {
                            // Fallback for environments without working recipe commands: enable equivalent base modules directly.
                            try {
                                await runDdev(['exec', 'drush', 'en', 'jsonapi', 'path', 'pathauto', '-y'], {cwd: drupalBackendPath, env: {...process.env, ...dockerEnv}});
                                applied = true;
                            } catch (e) {
                                errors.push(`- drush en fallback: Failed to execute command \`drush en jsonapi path pathauto -y\`: ${e.message}`);
                            }
                        }

                        if (!applied) {
                            const failureMessage = `Failed to apply recipe "${recipeName}". Attempts:\n${errors.join('\n')}`;
                            updateStep('apply-recipes', {inProgress: false, error: failureMessage});
                            markError(failureMessage);
                            return;
                        }

                        updateStep('apply-recipes', {inProgress: false, done: true});
                    }

                    updateStep('configure-drupal', {inProgress: false, done: true});

                    updateStep('astro', {inProgress: true});
                    const astroFrontendPath = path.join(projectRoot, 'astro-frontend');
                    
                    // Create Astro project only if it doesn't exist
                    if (!astroExists) {
                        await execa('npm', ['create', 'astro@latest', 'astro-frontend', '--', '--template', astroTemplate, '--yes', '--no-git'], { cwd: projectRoot, stdin: 'ignore' });
                    }
                    
                    // Ensure base dependencies are installed for the freshly created project
                    try {
                        await execa('npm', ['install'], {cwd: astroFrontendPath, stdin: 'ignore'});
                    } catch (e) {
                        // Proceed; we'll install specific deps below regardless
                    }
                    
                    // Install dependencies (no SSR adapter needed for static mode)
                    await execa('npm', ['install', '--save-dev', 'wrangler'], {cwd: astroFrontendPath, stdin: 'ignore'});
                    // Ensure astro is installed (create-astro should have done this, but verify)
                    await execa('npm', ['install', '--save', 'astro'], {cwd: astroFrontendPath, stdin: 'ignore'});
                    // Pin tslib to 2.6.2 for stable runtime resolution on Node 20
                    await execa('npm', ['install', '--save', 'jsona', 'drupal-jsonapi-params', 'tslib@2.6.2'], {cwd: astroFrontendPath, stdin: 'ignore'});

                    // Verify tslib is resolvable; install if still missing (belt and suspenders)
                    try {
                        await execa('node', ['-e', "require.resolve('tslib')"], {cwd: astroFrontendPath, stdin: 'ignore'});
                    } catch (_verifyErr) {
                        await execa('npm', ['install', '--save', 'tslib@2.6.2'], {cwd: astroFrontendPath, stdin: 'ignore'});
                    }

                    // Now update package.json name (AFTER all installs are complete)
                    const packageJsonPath = path.join(astroFrontendPath, 'package.json');
                    let packageContent = await fs.readFile(packageJsonPath, 'utf8');
                    const packageJson = JSON.parse(packageContent);
                    packageJson.name = `${projectName}-frontend`;

                    // Ensure Node engine (prefer Node 20 for local dev and Workers compat)
                    const engines = {...(packageJson.engines ?? {})};
                    engines.node = ">=20 <21";
                    packageJson.engines = engines;

                    // Ensure tslib is pinned to 2.6.2
                    const deps = {...(packageJson.dependencies ?? {})};
                    if (deps.tslib && deps.tslib !== '2.6.2') {
                      deps.tslib = '2.6.2';
                    } else if (!deps.tslib) {
                      deps.tslib = '2.6.2';
                    }
                    packageJson.dependencies = deps;

                    // Ensure required Astro scripts exist (create-astro sometimes skips installs in non-interactive runs)
                    const scripts = {...(packageJson.scripts ?? {})};
                    if (!scripts.dev) scripts.dev = 'astro dev';
                    if (!scripts.start) scripts.start = scripts.dev;
                    if (!scripts.build) scripts.build = 'astro build';
                    if (!scripts.preview) scripts.preview = 'astro preview';
                    if (!scripts.astro) scripts.astro = 'astro';
                    packageJson.scripts = scripts;

                    await fs.writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

                    // Write an .nvmrc to pin local dev to Node 20
                    await fs.writeFile(path.join(astroFrontendPath, '.nvmrc'), '20\n');

                    // Static mode Astro config (no SSR adapter needed)
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

                    // Write wrangler.jsonc for Cloudflare Pages deployment (static site)
                    const wranglerJsoncContent = `{
  "name": "${projectName}",
  "compatibility_date": "${new Date().toISOString().split('T')[0]}",
  "pages_build_output_dir": "./dist"
}
`;
                    await fs.writeFile(path.join(astroFrontendPath, 'wrangler.jsonc'), wranglerJsoncContent);

                    // Copy starter kit source files from templates/astro-src/
                    const templateSrcPath = path.join(projectRoot, 'templates', 'astro-src');
                    const targetSrcPath = path.join(astroFrontendPath, 'src');
                    
                    // Check if templates exist and copy them
                    try {
                        await fs.access(templateSrcPath);
                        
                        // Remove template pages created by create-astro (we have our own)
                        const pagesDir = path.join(targetSrcPath, 'pages');
                        try {
                            const templatePages = await fs.readdir(pagesDir);
                            for (const file of templatePages) {
                                await fs.unlink(path.join(pagesDir, file)).catch(() => {});
                            }
                        } catch (e) {
                            // Pages dir may not exist
                        }
                        
                        // Copy our templates
                        await copyDir(templateSrcPath, targetSrcPath);
                    } catch (e) {
                        // Templates not found - this is OK for projects that already have src files
                    }

                    updateStep('astro', {inProgress: false, done: true});
                    updateStep('complete', {done: true});
                    setShowNextSteps(true);
                } catch (error) {
                    markError(error.message);
                }
            };

            runSetup();
        }, [phase, projectName, adminUsername, adminPassword, astroTemplate, enableStructuredContent]);

        // Render different phases
        if (phase === 'welcome') {
            return React.createElement(
                Box,
                {flexDirection: 'column', paddingY: 1},
                React.createElement(Text, {bold: true, color: 'cyan'}, '🚀 Drupal + Astro + Cloudflare Starter Kit'),
                React.createElement(Text, null, ''),
                React.createElement(Text, {dimColor: true}, 'Let\'s get you set up! Press Enter to continue...'),
                React.createElement(TextInput, {
                    value: '',
                    onChange: () => {},
                    onSubmit: () => setPhase('prompts')
                })
            );
        }

        if (phase === 'prompts') {
            const templates = [
                {label: 'Basics (minimal starter)', value: 'basics'},
                {label: 'Blog (with content collections)', value: 'blog'},
                {label: 'Portfolio (showcase your work)', value: 'portfolio'},
                {label: 'Minimal (bare bones)', value: 'minimal'}
            ];

            if (promptStep === 0) {
                return React.createElement(
                    Box,
                    {flexDirection: 'column', paddingY: 1},
                    React.createElement(Text, {bold: true}, '🚀 Drupal + Astro + Cloudflare Setup'),
                    React.createElement(Text, null, ''),
                    React.createElement(Text, null, 'Project name (lowercase, hyphens only):'),
                    React.createElement(TextInput, {
                        value: projectName,
                        onChange: setProjectName,
                        onSubmit: handleProjectNameSubmit
                    }),
                    projectNameError ? React.createElement(Text, {color: 'red'}, `  ⚠️  ${projectNameError}`) : null
                );
            }

            if (promptStep === 1) {
                return React.createElement(
                    Box,
                    {flexDirection: 'column', paddingY: 1},
                    React.createElement(Text, {bold: true}, '🚀 Drupal + Astro + Cloudflare Setup'),
                    React.createElement(Text, null, ''),
                    React.createElement(Text, {dimColor: true}, `✓ Project name: ${projectName}`),
                    React.createElement(Text, null, ''),
                    React.createElement(Text, null, 'Drupal admin username:'),
                    React.createElement(TextInput, {
                        value: adminUsername,
                        onChange: setAdminUsername,
                        onSubmit: handleAdminUsernameSubmit,
                        placeholder: 'admin'
                    })
                );
            }

            if (promptStep === 2) {
                return React.createElement(
                    Box,
                    {flexDirection: 'column', paddingY: 1},
                    React.createElement(Text, {bold: true}, '🚀 Drupal + Astro + Cloudflare Setup'),
                    React.createElement(Text, null, ''),
                    React.createElement(Text, {dimColor: true}, `✓ Project name: ${projectName}`),
                    React.createElement(Text, {dimColor: true}, `✓ Admin username: ${adminUsername}`),
                    React.createElement(Text, null, ''),
                    React.createElement(Text, null, 'Drupal admin password:'),
                    React.createElement(TextInput, {
                        value: adminPassword,
                        onChange: setAdminPassword,
                        onSubmit: handleAdminPasswordSubmit,
                        placeholder: 'admin',
                        mask: '•'
                    })
                );
            }

            if (promptStep === 3) {
                return React.createElement(
                    Box,
                    {flexDirection: 'column', paddingY: 1},
                    React.createElement(Text, {bold: true}, '🚀 Drupal + Astro + Cloudflare Setup'),
                    React.createElement(Text, null, ''),
                    React.createElement(Text, {dimColor: true}, `✓ Project name: ${projectName}`),
                    React.createElement(Text, {dimColor: true}, `✓ Admin username: ${adminUsername}`),
                    React.createElement(Text, {dimColor: true}, `✓ Admin password: ${'•'.repeat(adminPassword.length)}`),
                    React.createElement(Text, null, ''),
                    React.createElement(Text, null, 'Choose Astro template:'),
                    React.createElement(SelectInput, {
                        items: templates,
                        onSelect: handleTemplateSelect
                    })
                );
            }

            if (promptStep === 4) {
                const items = [
                    {label: 'No (recommended)', value: 'no'},
                    {label: 'Yes (add Paragraphs structured content)', value: 'yes'}
                ];

                return React.createElement(
                    Box,
                    {flexDirection: 'column', paddingY: 1},
                    React.createElement(Text, {bold: true}, '🚀 Drupal + Astro + Cloudflare Setup'),
                    React.createElement(Text, null, ''),
                    React.createElement(Text, {dimColor: true}, `✓ Project name: ${projectName}`),
                    React.createElement(Text, {dimColor: true}, `✓ Admin username: ${adminUsername}`),
                    React.createElement(Text, {dimColor: true}, `✓ Admin password: ${'•'.repeat(adminPassword.length)}`),
                    React.createElement(Text, {dimColor: true}, `✓ Astro template: ${astroTemplate}`),
                    React.createElement(Text, null, ''),
                    React.createElement(Text, null, 'Enable structured content model (Paragraphs)?'),
                    React.createElement(SelectInput, {
                        items,
                        onSelect: handleStructuredContentSelect
                    })
                );
            }
        }

        if (phase === 'setup') {
            const stepElements = steps
                .filter(step => step.id !== 'complete' || step.done)
                .map(step => React.createElement(Step, {...step, key: step.id}));
            const nextStepsElements = showNextSteps ? [
                React.createElement(Text, {key: 'next-gap'}, ''),
                React.createElement(Text, {key: 'next-title', bold: true}, '🎉 Next Steps:'),
                React.createElement(Text, {key: 'next-1'}, '  1. Start the Drupal backend:'),
                React.createElement(Text, {key: 'next-1-cmd', dimColor: true}, '     cd drupal-backend && ddev launch'),
                React.createElement(Text, {key: 'next-2'}, '  2. Start the Astro frontend (in a new terminal from project root):'),
                React.createElement(Text, {key: 'next-2-cmd', dimColor: true}, '     cd astro-frontend && npm run dev'),
                React.createElement(Text, {key: 'next-2-alt', dimColor: true}, '     (If port 4321 is in use: npm run dev -- --port 4322)'),
                React.createElement(Text, {key: 'next-3'}, '  3. Your sites will be available at:'),
                React.createElement(Text, {key: 'next-3-drupal', dimColor: true}, `     Drupal: http://${projectName}.ddev.site (admin: ${adminUsername}/${adminPassword})`),
                React.createElement(Text, {key: 'next-3-astro', dimColor: true}, '     Astro:  http://localhost:4321'),
                React.createElement(Text, {key: 'next-end'}, '')
            ] : [];
            const headerColor = showNextSteps ? 'green' : 'cyan';
            const headerText = showNextSteps ? `✅ ${projectName} is ready!` : `🔧 Setting up ${projectName}...`;

            return React.createElement(
                Box,
                {flexDirection: 'column'},
                React.createElement(Text, {bold: true, color: headerColor}, headerText),
                React.createElement(Text, null, ''),
                failedMessage ? React.createElement(Text, {color: 'red'}, `\n❌ Setup failed: ${failedMessage}\n`) : null,
                ...stepElements,
                ...nextStepsElements
            );
        }

        return null;
    };

    return App;
};
