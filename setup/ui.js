'use strict';

module.exports = ({
    React,
    ink,
    Spinner,
    execa,
    fs,
    path
}) => {
    const {Text, Box} = ink;
    const {useState, useEffect} = React;

    const Step = ({text, inProgress, done, error}) => {
        const contents = [];

        if (inProgress) {
            contents.push(React.createElement(Spinner, {type: 'dots', key: 'spinner'}));
        }

        if (done && !error) {
            contents.push('✅');
        }

        if (error) {
            contents.push('❌');
        }

        contents.push(' ');
        contents.push(text);

        return React.createElement(
            Box,
            null,
            React.createElement(Text, null, ...contents)
        );
    };

    const App = () => {
        const [steps, setSteps] = useState([
            {id: 'env', text: 'Syncing .env file', inProgress: true, done: false, error: null},
            {id: 'docker-socket', text: 'Checking Docker socket', inProgress: false, done: false, error: null},
            {id: 'ddev-config', text: 'Configuring DDEV', inProgress: false, done: false, error: null},
            {id: 'ddev-start', text: 'Starting DDEV', inProgress: false, done: false, error: null},
            {id: 'ddev-composer-create', text: 'Creating Drupal project with Composer', inProgress: false, done: false, error: null},
            {id: 'ddev-drush', text: 'Installing Drush', inProgress: false, done: false, error: null},
            {id: 'ddev-site-install', text: 'Installing Drupal site', inProgress: false, done: false, error: null},
            {id: 'astro', text: 'Setting up Astro frontend', inProgress: false, done: false, error: null},
            {id: 'complete', text: 'Setup Complete!', inProgress: false, done: false, error: null}
        ]);
        const [failedMessage, setFailedMessage] = useState(null);

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

        useEffect(() => {
            // Try to resolve Docker environment (e.g., Colima) and return env overrides
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

                // 1) If DOCKER_HOST is set, try to use it
                if (process.env.DOCKER_HOST && process.env.DOCKER_HOST.trim() !== '') {
                    const unixPath = parseUnixSocketFromHost(process.env.DOCKER_HOST.trim());
                    if (unixPath) {
                        if (await isDockerSocketAvailable(unixPath)) {
                            return {DOCKER_HOST: process.env.DOCKER_HOST.trim(), __socketPath: unixPath};
                        }
                    } else {
                        // Non-unix DOCKER_HOST (tcp, npipe). Assume available and let ddev surface errors.
                        return {DOCKER_HOST: process.env.DOCKER_HOST.trim()};
                    }
                }

                // 2) Detect Colima socket
                try {
                    const result = await execa('colima', ['status'], {timeout: 2000});
                    const stdout = result.stdout || '';
                    const match = stdout.match(/docker socket:\s*(\S+)/i);
                    if (match && match[1]) {
                        const colimaSocket = match[1].replace(/^unix:\/\//, '');
                        if (await isDockerSocketAvailable(colimaSocket)) {
                            return {DOCKER_HOST: `unix://${colimaSocket}` , __socketPath: colimaSocket};
                        }
                    }
                } catch (e) {
                    // colima may not be installed; ignore and fallback
                }

                // 3) Fallback to docker context inspect
                try {
                    const ctx = await execa('docker', ['context', 'inspect'], {timeout: 2000});
                    const json = JSON.parse(ctx.stdout);
                    if (Array.isArray(json) && json.length > 0) {
                        const host = json[0]?.Endpoints?.docker?.Host;
                        const unixPath = parseUnixSocketFromHost(host);
                        if (unixPath) {
                            if (await isDockerSocketAvailable(unixPath)) {
                                return {DOCKER_HOST: `unix://${unixPath}`, __socketPath: unixPath};
                            }
                        } else if (host && typeof host === 'string') {
                            // Non-unix host (tcp). Use it without probing.
                            return {DOCKER_HOST: host};
                        }
                    }
                } catch (e) {
                    // Ignore; we'll proceed to default
                }

                // 4) Default unix socket
                const defaultSocket = '/var/run/docker.sock';
                if (await isDockerSocketAvailable(defaultSocket)) {
                    return {DOCKER_HOST: `unix://${defaultSocket}`, __socketPath: defaultSocket};
                }

                return {}; // not resolvable
            };
            const dockerInfoWorks = async (extraEnv = {}) => {
                try {
                    await execa('docker', ['info', '--format', '{{json .ServerVersion}}'], {
                        env: {...process.env, ...extraEnv},
                        timeout: 3000
                    });
                    return true;
                } catch {
                    return false;
                }
            };
            // FS and command helpers
            const pathExists = async (p) => {
                try { await fs.access(p); return true; } catch { return false; }
            };
            const runDdev = async (args, options) => {
                try {
                    return await execa('ddev', args, options);
                } catch (error) {
                    const errMsg = (error && (error.stderr || error.stdout || error.message)) || 'Unknown error';
                    throw new Error(errMsg);
                }
            };
            const runSetup = async () => {
                try {
                    const projectRoot = path.resolve(process.cwd(), '..');
                    const projectName = path.basename(projectRoot);
                    const envPath = path.join(projectRoot, '.env');
                    const exampleEnvPath = path.join(projectRoot, '.env.example');
                    const dockerEnvCandidate = await resolveDockerEnv();

                    const envExists = await fs
                        .access(envPath)
                        .then(() => true)
                        .catch(() => false);

                    if (!envExists) {
                        await fs.copyFile(exampleEnvPath, envPath);
                        let content = await fs.readFile(envPath, 'utf8');
                        content = content.replace(/your-project-name/g, projectName);
                        const drupalApiUrl = `http://${projectName}.ddev.site/jsonapi`;
                        content += `\nDRUPAL_API_URL=${drupalApiUrl}\n`;
                        await fs.writeFile(envPath, content);
                    }

                    updateStep('env', {inProgress: false, done: true});

                    // Verify Docker availability using CLI; fallback to DOCKER_HOST if needed
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
                            const hint = 'Docker daemon is not reachable. Start Docker Desktop or Colima, or set DOCKER_HOST to your socket (e.g., unix:///Users/rob/.colima/default/docker.sock).';
                            updateStep('docker-socket', {inProgress: false, error: hint});
                            markError(hint);
                            return;
                        }
                    } else {
                        const hint = 'Docker daemon is not reachable. Start Docker Desktop or Colima, or set DOCKER_HOST to your socket (e.g., unix:///Users/rob/.colima/default/docker.sock).';
                        updateStep('docker-socket', {inProgress: false, error: hint});
                        markError(hint);
                        return;
                    }

                    updateStep('ddev-config', {inProgress: true});

                    const drupalBackendPath = path.join(projectRoot, 'drupal-backend');
                    await fs.mkdir(drupalBackendPath, {recursive: true});
                    
                    try {
                        await runDdev(['config', '--project-type=drupal11', '--php-version=8.3', '--docroot=web', `--project-name=${projectName}`, '--auto'], {cwd: drupalBackendPath, env: {...process.env, ...dockerEnv}});
                    } catch (error) {
                        if (error.message.includes('not a valid project name') || error.message.includes('valid hostname')) {
                            const sanitizedName = projectName.replace(/_/g, '-');
                            const hint = `Project name "${projectName}" contains underscores which are not allowed in hostnames. Rename your project directory to use hyphens (e.g., "${sanitizedName}") and try again.`;
                            updateStep('ddev-config', {inProgress: false, error: hint});
                            markError(hint);
                            return;
                        }
                        throw error;
                    }
                    
                    updateStep('ddev-config', {inProgress: false, done: true});
                    updateStep('ddev-start', {inProgress: true});

                    await runDdev(['start'], {cwd: drupalBackendPath, env: {...process.env, ...dockerEnv}});

                    updateStep('ddev-start', {inProgress: false, done: true});
                    // Idempotent create-project: skip if already present
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
                    } catch (e) {
                        // Drush might already be installed; continue
                    }

                    updateStep('ddev-drush', {inProgress: false, done: true});
                    updateStep('ddev-site-install', {inProgress: true});
                    const settingsPhp = path.join(drupalBackendPath, 'web', 'sites', 'default', 'settings.php');
                    const isInstalled = await pathExists(settingsPhp);
                    if (!isInstalled) {
                        await runDdev(['exec', 'drush', 'site:install', '--account-name=admin', '--account-pass=admin', '-y'], {cwd: drupalBackendPath, env: {...process.env, ...dockerEnv}});
                    }

                    updateStep('ddev-site-install', {inProgress: false, done: true});
                    updateStep('astro', {inProgress: true});

                    const astroFrontendPath = path.join(projectRoot, 'astro-frontend');
                    await execa('npm', ['create', 'astro@latest', 'astro-frontend', '--', '--template', 'basics', '--yes', '--no-git'], { cwd: projectRoot });
                    await execa('npm', ['install', '--save-dev', 'wrangler'], {cwd: astroFrontendPath});
                    await execa('npx', ['astro', 'add', 'cloudflare'], {cwd: astroFrontendPath});

                    const packageJsonPath = path.join(astroFrontendPath, 'package.json');
                    let packageContent = await fs.readFile(packageJsonPath, 'utf8');
                    const packageJson = JSON.parse(packageContent);
                    packageJson.name = `${projectName}-frontend`;
                    await fs.writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

                    const astroConfigContent = `
import { defineConfig } from 'astro/config';
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

                    const wranglerTomlContent = `
name = "${projectName}"
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
                    await execa('npm', ['install', 'jsona', 'drupal-jsonapi-params'], {cwd: astroFrontendPath});

                    updateStep('astro', {inProgress: false, done: true});
                    updateStep('complete', {done: true});
                } catch (error) {
                    markError(error.message);
                }
            };

            runSetup();
        }, []);

        const stepElements = steps
            .filter(step => step.id !== 'complete' || step.done)
            .map(step => React.createElement(Step, {...step, key: step.id}));

        return React.createElement(
            Box,
            {flexDirection: 'column'},
            React.createElement(Text, {bold: true}, 'Drupal + Astro + Cloudflare Setup'),
            failedMessage ? React.createElement(Text, {color: 'red'}, `\nSetup failed: ${failedMessage}\n`) : null,
            ...stepElements
        );
    };

    return App;
};