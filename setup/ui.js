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
            {id: 'ddev', text: 'Setting up DDEV and Drupal', inProgress: false, done: false, error: null},
            {id: 'astro', text: 'Setting up Astro frontend', inProgress: false, done: false, error: null},
            {id: 'complete', text: 'Setup Complete!', inProgress: false, done: false, error: null}
        ]);

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
        };

        useEffect(() => {
            const runSetup = async () => {
                try {
                    const projectName = path.basename(process.cwd());
                    const envPath = path.join(process.cwd(), '.env');
                    const exampleEnvPath = path.join(process.cwd(), '.env.example');

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
                    updateStep('ddev', {inProgress: true});

                    const drupalBackendPath = path.join(process.cwd(), 'drupal-backend');
                    await fs.mkdir(drupalBackendPath, {recursive: true});
                    await execa('ddev', ['config', '--project-type=drupal11', '--php-version=8.3', '--docroot=web', `--project-name=${projectName}`, '--auto'], {cwd: drupalBackendPath});
                    await execa('ddev', ['start'], {cwd: drupalBackendPath});
                    await execa('ddev', ['composer', 'create', 'drupal/recommended-project:^11', '-y'], {cwd: drupalBackendPath});
                    await execa('ddev', ['composer', 'require', 'drush/drush'], {cwd: drupalBackendPath});
                    await execa('ddev', ['exec', 'drush', 'site:install', '--account-name=admin', '--account-pass=admin', '-y'], {cwd: drupalBackendPath});

                    updateStep('ddev', {inProgress: false, done: true});
                    updateStep('astro', {inProgress: true});

                    const astroFrontendPath = path.join(process.cwd(), 'astro-frontend');
                    await execa('npm', ['create', 'astro@latest', 'astro-frontend', '--', '--template', 'basics', '--yes', '--no-git']);
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
                    await fs.writeFile(path.join(process.cwd(), 'wrangler.toml'), wranglerTomlContent);
                    await execa('npm', ['install', 'jsona', 'drupal-jsonapi-params'], {cwd: astroFrontendPath});

                    updateStep('astro', {inProgress: false, done: true});
                    updateStep('complete', {done: true});
                } catch (error) {
                    markError(error.message);
                }
            };

            runSetup();
        }, []);

        const stepElements = steps.map(step =>
            React.createElement(Step, {...step, key: step.id})
        );

        return React.createElement(
            Box,
            {flexDirection: 'column'},
            React.createElement(Text, {bold: true}, 'Drupal + Astro + Cloudflare Setup'),
            ...stepElements
        );
    };

    return App;
};