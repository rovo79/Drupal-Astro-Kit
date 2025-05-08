# 🚀 Drupal + Astro + Cloudflare Starter Kit

A production-ready starter kit featuring a lightning‑fast Astro frontend on Cloudflare Pages, powered by a robust Drupal 11 backend running via DDEV, seamlessly integrated through automated setup scripts and ready to leverage Cloudflare's serverless primitives (D1, R2, and Workers KV).

my-saas-kit/
├── astro-frontend/          # (populated by setup-astro.sh)
├── drupal-backend/          # (populated by setup-ddev.sh)
├── scripts/
│   ├── setup-ddev.sh
│   ├── setup-astro.sh
│   ├── deploy-frontend.sh
│   └── env-sync.sh
├── wrangler.toml
├── .env.example
└── README.md

Run in sequence:

```bash
chmod +x scripts/*.sh
scripts/env-sync.sh
scripts/setup-ddev.sh
scripts/setup-astro.sh
```

→ Then spin up local servers (ddev launch, wrangler pages dev) or deploy with scripts/deploy-frontend.sh.

🏗️ Frontend: Astro → Cloudflare Pages

- Astro is designed for zero‑JS‑runtime static builds, making it ideal for high performance and cost‑efficient hosting on Cloudflare Pages
- The official guide walks you through installing @astrojs/cloudflare adapter, configuring astro.config.mjs, and adding wrangler pages dev for local previews
- CI/CD is seamless: connect your Git repo in Cloudflare Pages settings, and every push triggers a fresh Astro build & deploy

🛠️ Backend: Drupal 11 + DDEV

- DDEV is the community‑recommended Docker‑based dev environment for Drupal, offering one‑command setup of web, database, and CLI tools
- Using composer create "drupal/recommended-project:^11" ensures you're on the latest Drupal 11 release, with proper dependency management and PSR‑4 autoloading
- You'll configure .ddev/config.yaml for PHP 8.3+, custom docroot, and automatic Drush integration—then run ddev drush site:install to spin up your site in seconds

⚙️ Automation: setup-ddev.sh

Your bootstrap script should:

- Verify dependencies (ddev, docker, composer) and exit with clear errors
- Initialize DDEV (ddev config --project-type=drupal11 --docroot=web) and start services
- Install Drupal via Composer template and Drush, then run drush site:install with admin credentials
- Generate .env pointing Astro to your local JSON:API endpoint (<http://drupal-backend.ddev.site/jsonapi>)
- Use set -e and meaningful variable names for robust error handling and readability

☁️ Cloudflare Integrations:

- D1 (Serverless SQLite): Create and bind a D1 database in wrangler.toml, then run migrations with Drizzle or wrangler d1
- R2 (Object Storage): Provision buckets in Cloudflare Dashboard or CLI, apply CORS policies, and bind via r2_buckets in wrangler.toml
- Workers KV: Define namespaces, bind in wrangler.toml, and leverage low‑latency, globally distributed key–value storage for configs, sessions, or caches

🔄 CI/CD Pipeline

The project includes a comprehensive GitHub Actions workflow for automated testing and deployment:

1. Frontend Pipeline (Astro → Cloudflare Pages):
   - Automated testing and deployment on every push/PR to main
   - Node.js 20 environment setup
   - Dependency installation with `npm ci`
   - Frontend test suite execution
   - Automatic deployment to Cloudflare Pages (main branch only)

2. Backend Pipeline (Drupal + DDEV):
   - Parallel execution with frontend pipeline
   - DDEV environment setup and configuration
   - Drupal dependency management via Composer
   - Automated Drupal test suite execution
   - Production deployment via DDEV (main branch only)

Required GitHub Secrets:

```bash
CLOUDFLARE_API_TOKEN      # Your Cloudflare API token
CLOUDFLARE_ACCOUNT_ID     # Your Cloudflare account ID
CLOUDFLARE_PROJECT_NAME   # Your Cloudflare Pages project name
PROD_DDEV_HOST           # Production DDEV host
PROD_DDEV_SSH_KEY        # SSH key for production DDEV access
```

To set up these secrets:

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Add each secret with its corresponding value

The workflow file is located at `.github/workflows/main.yml` and can be customized for additional environments or requirements.
