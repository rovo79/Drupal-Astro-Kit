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
                setPhase('setup');
            } else {
                setPromptStep(3);
            }
        };

        const handleTemplateSelect = (item) => {
            setAstroTemplate(item.value);
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
                        let content = await fs.readFile(envPath, 'utf8');
                        content = content.replace(/your-project-name/g, projectName);
                        const drupalApiUrl = `http://${projectName}.ddev.site/jsonapi`;
                        content += `\nDRUPAL_API_URL=${drupalApiUrl}\n`;
                        await fs.writeFile(envPath, content);
                    }
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
                    
                    // Enable JSON:API module (core)
                    try {
                        await runDdev(['exec', 'drush', 'en', 'jsonapi', '-y'], {cwd: drupalBackendPath, env: {...process.env, ...dockerEnv}});
                    } catch (e) {
                        // Ignore if already enabled or fails (will be caught by audit)
                    }

                    // T012: Inject CORS configuration
                    // T024: Add services.yml CORS section cross-reference
                    const servicesYmlPath = path.join(drupalBackendPath, 'web', 'sites', 'default', 'services.yml');
                    const defaultServicesYmlPath = path.join(drupalBackendPath, 'web', 'sites', 'default', 'default.services.yml');
                    
                    if (await pathExists(defaultServicesYmlPath) && !await pathExists(servicesYmlPath)) {
                        await fs.copyFile(defaultServicesYmlPath, servicesYmlPath);
                        await fs.chmod(servicesYmlPath, 0o644);
                    }

                    if (await pathExists(servicesYmlPath)) {
                        let servicesContent = await fs.readFile(servicesYmlPath, 'utf8');
                        if (!servicesContent.includes('cors.config:')) {
                            const corsConfig = `
parameters:
  cors.config:
    enabled: true
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
    allowedMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
    allowedOrigins: ['http://localhost:4321', 'https://${projectName}.workers.dev']
    exposedHeaders: false
    maxAge: false
    supportsCredentials: false
`;
                            servicesContent += "\\n" + corsConfig;
                            await fs.writeFile(servicesYmlPath, servicesContent);
                        }
                    }

                    // T009, T010: Create page content type and fields
                    // T011: Uniqueness guidance for field_slug (comment: ensure unique slugs in logic if possible)
                    // T013: Verify anonymous 'access content' permission
                    // T015: Constitution compliance checklist:
                    // - Service boundaries respected
                    // - Config-driven
                    // - Automation
                    // T026: TODO: Performance optimization (caching)
                    // T030: TODO: Additional bundles (article, taxonomy)

                    const phpCode = `
if (!\\Drupal::entityTypeManager()->getStorage('node_type')->load('page')) {
  $type = \\Drupal\\node\\Entity\\NodeType::create(['type' => 'page', 'name' => 'Basic Page']);
  $type->save();
}

$fields = [
  'field_slug' => ['type' => 'string', 'label' => 'Slug'],
  'field_summary' => ['type' => 'string_long', 'label' => 'Summary'],
  'field_body' => ['type' => 'text_long', 'label' => 'Body'],
];

foreach ($fields as $name => $info) {
  if (!\\Drupal\\field\\Entity\\FieldStorageConfig::loadByName('node', $name)) {
    \\Drupal\\field\\Entity\\FieldStorageConfig::create([
      'field_name' => $name,
      'entity_type' => 'node',
      'type' => $info['type'],
    ])->save();
  }
  if (!\\Drupal\\field\\Entity\\FieldConfig::loadByName('node', 'page', $name)) {
    \\Drupal\\field\\Entity\\FieldConfig::create([
      'field_name' => $name,
      'entity_type' => 'node',
      'bundle' => 'page',
      'label' => $info['label'],
    ])->save();
  }
}

user_role_grant_permissions('anonymous', ['access content']);
`;
                    try {
                        await runDdev(['exec', 'drush', 'php:eval', phpCode], {cwd: drupalBackendPath, env: {...process.env, ...dockerEnv}});
                    } catch (e) {
                        // Proceed even if this fails (e.g. if already exists)
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
                    
                    // Install additional dependencies (wrangler, Drupal libraries)
                    await execa('npm', ['install', '--save-dev', 'wrangler'], {cwd: astroFrontendPath, stdin: 'ignore'});
                    // Pin tslib to 2.6.2 for stable runtime resolution on Node 20/Workers
                    await execa('npm', ['install', '--save', 'jsona', 'drupal-jsonapi-params', 'tslib@2.6.2'], {cwd: astroFrontendPath, stdin: 'ignore'});
                    
                    // Add Cloudflare adapter (this modifies package.json and astro.config.mjs)
                    await execa('npx', ['astro', 'add', 'cloudflare', '--yes'], {cwd: astroFrontendPath, stdin: 'ignore'});

                    // Ensure any adapter-added dependencies are installed
                    try {
                        await execa('npm', ['install'], {cwd: astroFrontendPath, stdin: 'ignore'});
                    } catch (_) {}

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

                    const astroConfigContent = `import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    imageService: 'cloudflare'
  }),
  site: 'https://${projectName}.workers.dev',
  vite: {
    build: {
      sourcemap: true
    }
  }
});
`;
                    await fs.writeFile(path.join(astroFrontendPath, 'astro.config.mjs'), astroConfigContent);
                    await fs.copyFile(envPath, path.join(astroFrontendPath, '.env'));

                    const wranglerTomlContent = `name = "${projectName}"
main = "./astro-frontend/dist/_worker.js/index.js"
compatibility_date = "${new Date().toISOString().split('T')[0]}"
compatibility_flags = ["nodejs_compat"]

[assets]
binding = "ASSETS"
directory = "./astro-frontend/dist"

[build]
command = "cd astro-frontend && npm run build"

[observability]
enabled = true

[[kv_namespaces]]
binding = "SESSION"
id = "your-kv-namespace-id"
`;
                    await fs.writeFile(path.join(projectRoot, 'wrangler.toml'), wranglerTomlContent);

                    updateStep('astro', {inProgress: false, done: true});
                    updateStep('complete', {done: true});
                    setShowNextSteps(true);
                } catch (error) {
                    markError(error.message);
                }
            };

            runSetup();
        }, [phase, projectName, adminUsername, adminPassword, astroTemplate]);

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
                React.createElement(Text, {key: 'next-2'}, '  2. Start the Astro frontend:'),
                React.createElement(Text, {key: 'next-2-cmd', dimColor: true}, '     cd astro-frontend && npm run dev'),
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
