# 🚀 Drupal + Astro + Cloudflare Starter Kit

A production-ready starter kit featuring a lightning‑fast Astro frontend on Cloudflare Pages, powered by a robust Drupal 11 backend running via DDEV, seamlessly integrated through automated setup scripts and ready to leverage Cloudflare's serverless primitives (D1, R2, and Workers KV).

## 🚦 Getting Started

### Prerequisites

- DDEV (for local Drupal development)
- Docker (required by DDEV)
- Node.js (for Astro frontend)
- Composer (for Drupal dependencies)

### Quick Start

1. Clone the repository:

   ```bash
   git clone [your-repo-url]
   cd Drupal_Astro_Kit
   ```

2. Make the setup scripts executable:

   ```bash
   chmod +x scripts/*.sh
   ```

3. Run the setup scripts in sequence:

   ```bash
   # First, sync environment variables
   scripts/env-sync.sh

   # Then set up the Drupal backend
   scripts/setup-ddev.sh

   # Finally, set up the Astro frontend
   scripts/setup-astro.sh
   ```

4. Start the development servers:
   - For Drupal backend: `ddev launch`
   - For Astro frontend: `cd astro-frontend && npm run dev`

### What's Included

- **Drupal Backend** (`setup-ddev.sh`):
  - Drupal 11 installation with DDEV
  - Drush integration
  - Default admin account (username: admin, password: admin)
  - Environment configuration

- **Astro Frontend** (`setup-astro.sh`):
  - Fresh Astro project with Cloudflare adapter
  - Wrangler configuration
  - Environment setup

### Development URLs

- Drupal Backend: `http://drupal-backend.ddev.site`
- Astro Frontend: `http://localhost:4321`

### 🔧 Troubleshooting

#### Common Issues

1. **DDEV Connection Issues**
   - If `ddev launch` fails, try:

     ```bash
     ddev restart
     ddev describe  # Check service status
     ```

   - Ensure Docker is running: `docker ps`

2. **Astro Frontend Issues**
   - If `npm run dev` fails:

     ```bash
     cd astro-frontend
     rm -rf node_modules
     npm install
     ```

   - Check Node.js version: `node --version` (should be 18+)

3. **Environment Variables**
   - If services can't connect, verify `.env` files:

     ```bash
     scripts/env-sync.sh  # Regenerate env files
     ```

   - Check Drupal API URL in `.env`: Should match DDEV URL

4. **Port Conflicts**
   - If ports are already in use:

     ```bash
     # Check what's using the ports
     lsof -i :80
     lsof -i :443
     lsof -i :4321
     ```

   - Modify DDEV ports in `.ddev/config.yaml` if needed

### 🛠️ Customizing the Setup

#### Drupal Backend Customization

1. **PHP Version**
   - Edit `.ddev/config.yaml`:

     ```yaml
     php_version: "8.3"  # Change to desired version
     ```

2. **Drupal Modules**
   - Add modules via Composer:

     ```bash
     cd drupal-backend
     ddev composer require drupal/module_name
     ```

3. **Custom Configuration**
   - Place custom settings in `drupal-backend/web/sites/default/settings.local.php`
   - Add custom modules to `drupal-backend/web/modules/custom`

#### Astro Frontend Customization

1. **Build Configuration**
   - Modify `astro-frontend/astro.config.mjs`:

     ```javascript
     export default defineConfig({
       output: 'server',  // Change to 'static' for static builds
       adapter: cloudflare()
     });
     ```

2. **Environment Variables**
   - Add custom variables to `.env`:

     ```bash
     CUSTOM_VAR=value
     ```

   - Access in Astro via `import.meta.env.CUSTOM_VAR`

3. **Cloudflare Integration**
   - Configure D1, R2, or KV in `wrangler.toml`:

     ```toml
     [[d1_databases]]
     binding = "DB"
     database_name = "my-database"
     database_id = "xxx"
     ```

#### Development Workflow

1. **Local Development**
   - Use `ddev start` and `npm run dev` for local development
   - Enable Xdebug in DDEV for PHP debugging
   - Use Astro's built-in dev tools for frontend debugging

2. **Production Deployment**
   - Frontend: Use `scripts/deploy-frontend.sh`
   - Backend: Configure production DDEV settings
   - Update environment variables for production

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
