'use strict';
const React = require('react');
const { Text, Box } = require('ink');
const { useState, useEffect } = require('react');
const execa = require('execa');
const Spinner = require('ink-spinner');
const fs = require('fs').promises;
const path = require('path');

// Helper component for displaying a step
const Step = ({ text, inProgress, done, error }) => (
    <Box>
        <Text>
            {inProgress && <Spinner type="dots" />}
            {done && !error && '✅'}
            {error && '❌'}
            {' '}
            {text}
        </Text>
    </Box>
);

const App = () => {
    const [steps, setSteps] = useState([
        { id: 'env', text: 'Syncing .env file', inProgress: true, done: false, error: null },
        { id: 'ddev', text: 'Setting up DDEV and Drupal', inProgress: false, done: false, error: null },
        { id: 'astro', text: 'Setting up Astro frontend', inProgress: false, done: false, error: null },
        { id: 'complete', text: 'Setup Complete!', inProgress: false, done: false, error: null }
    ]);

    const updateStep = (id, updates) => {
        setSteps(prevSteps =>
            prevSteps.map(step => (step.id === id ? { ...step, ...updates } : step))
        );
    };

    useEffect(() => {
        const runSetup = async () => {
            try {
                // --- Step 1: Environment Sync ---
                const projectName = path.basename(process.cwd());
                const envPath = path.join(process.cwd(), '.env');
                const exampleEnvPath = path.join(process.cwd(), '.env.example');

                if (!await fs.access(envPath).then(() => true).catch(() => false)) {
                    await fs.copyFile(exampleEnvPath, envPath);
                    let content = await fs.readFile(envPath, 'utf8');
                    content = content.replace(/your-project-name/g, projectName);
                    const drupalApiUrl = `http://${projectName}.ddev.site/jsonapi`;
                    content += `
DRUPAL_API_URL=${drupalApiUrl}
`;
                    await fs.writeFile(envPath, content);
                }
                updateStep('env', { inProgress: false, done: true });
                updateStep('ddev', { inProgress: true });


                // --- Step 2: DDEV and Drupal Setup ---
                const drupalBackendPath = path.join(process.cwd(), 'drupal-backend');
                await fs.mkdir(drupalBackendPath, { recursive: true });
                await execa('ddev', ['config', '--project-type=drupal11', '--php-version=8.3', '--docroot=web', `--project-name=${projectName}`, '--auto'], { cwd: drupalBackendPath });
                await execa('ddev', ['start'], { cwd: drupalBackendPath });
                await execa('ddev', ['composer', 'create', 'drupal/recommended-project:^11', '-y'], { cwd: drupalBackendPath });
                await execa('ddev', ['composer', 'require', 'drush/drush'], { cwd: drupalBackendPath });
                await execa('ddev', ['exec', 'drush', 'site:install', '--account-name=admin', '--account-pass=admin', '-y'], { cwd: drupalBackendPath });
                updateStep('ddev', { inProgress: false, done: true });
                updateStep('astro', { inProgress: true });


                // --- Step 3: Astro Frontend Setup ---
                const astroFrontendPath = path.join(process.cwd(), 'astro-frontend');
                await execa('npm', ['create', 'astro@latest', 'astro-frontend', '--', '--template', 'basics', '--yes', '--no-git']);
                await execa('npm', ['install', '--save-dev', 'wrangler'], { cwd: astroFrontendPath });
                await execa('npx', ['astro', 'add', 'cloudflare'], { cwd: astroFrontendPath });
                // Update package.json
                const packageJsonPath = path.join(astroFrontendPath, 'package.json');
                let pkgJsonContent = await fs.readFile(packageJsonPath, 'utf8');
                let pkgJson = JSON.parse(pkgJsonContent);
                pkgJson.name = `${projectName}-frontend`;
                await fs.writeFile(packageJsonPath, JSON.stringify(pkgJson, null, 2));

                // Create astro.config.mjs
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

                // Create wrangler.toml
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
                await fs.writeFile(path.join(process.cwd(), 'wrangler.toml'), wranglerTomlContent);
                await execa('npm', ['install', 'jsona', 'drupal-jsonapi-params'], { cwd: astroFrontendPath });
                updateStep('astro', { inProgress: false, done: true });
                updateStep('complete', { done: true });

            } catch (e) {
                const currentStep = steps.find(s => s.inProgress);
                if (currentStep) {
                    updateStep(currentStep.id, { inProgress: false, error: e.message });
                }
            }
        };

        runSetup();
    }, []);

    return (
        <Box flexDirection="column">
            <Text bold>Drupal + Astro + Cloudflare Setup</Text>
            {steps.map(step => (
                <Step key={step.id} {...step} />
            ))}
        </Box>
    );
};

module.exports = App;