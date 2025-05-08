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

### 📝 Project Naming Conventions

#### Repository and Project Names

The starter kit uses your GitHub repository name to determine the Cloudflare Pages project name. This ensures unique deployments for each project:

1. **Repository Name**:
   - Choose a descriptive name for your GitHub repository
   - Example: `my-astro-drupal-site`
   - This becomes your project name automatically

2. **Cloudflare Pages URL**:
   - Your site will be available at: `https://<repository-name>.pages.dev`
   - Example: `https://my-astro-drupal-site.pages.dev`

3. **Naming Best Practices**:
   - Use lowercase letters
   - Use hyphens for spaces
   - Keep it short but descriptive
   - Avoid special characters
   - Examples:
     - `my-astro-drupal-site`
     - `company-website`
     - `portfolio-2024`

4. **Multiple Projects**:
   - Each repository creates its own Cloudflare Pages project
   - Projects are isolated by repository name
   - No conflicts between different projects
   - Each project gets its own subdomain

5. **Changing Project Name**:
   - The project name is derived from the repository name
   - To change it, rename your GitHub repository
   - The Cloudflare Pages project will update automatically
   - Old URLs will redirect to the new project name

### 🌐 Custom Domains

Custom domains are configured through the Cloudflare Dashboard, not through the starter kit:

1. **Cloudflare Pages Setup**:
   - Go to Cloudflare Dashboard → Pages
   - Select your project
   - Click "Custom domains"
   - Click "Set up a custom domain"

2. **Domain Requirements**:
   - Your domain must be managed by Cloudflare
   - DNS records will be automatically configured
   - SSL certificates are automatically provisioned

3. **Multiple Domains**:
   - You can add multiple custom domains
   - Each domain can have its own SSL certificate
   - All domains point to the same Cloudflare Pages deployment

4. **Domain Verification**:
   - Cloudflare will verify domain ownership
   - DNS records are automatically configured
   - SSL certificates are automatically provisioned

5. **Best Practices**:
   - Set up custom domains after initial deployment
   - Use Cloudflare's DNS management
   - Enable Cloudflare's security features
   - Consider setting up redirects from www to non-www (or vice versa)

### ☁️ Cloudflare: Pages vs Workers

The starter kit primarily uses Cloudflare Pages for the Astro frontend, but it's important to understand the difference:

1. **Cloudflare Pages**:
   - Static site hosting platform
   - Handles our Astro frontend deployment
   - Features:
     - Automatic builds from Git
     - Asset optimization
     - Global CDN distribution
     - Automatic SSL certificates
     - Preview deployments
   - Perfect for static Astro builds

2. **Cloudflare Workers**:
   - Serverless computing platform
   - Optional for additional functionality
   - Use cases:
     - API routes
     - Server-side rendering (SSR)
     - Custom middleware
     - Edge functions
   - Can be added if needed for dynamic features

3. **How They Work Together**:
   - Pages hosts the static frontend
   - Workers can be added for dynamic features
   - Both run on Cloudflare's global network
   - Both benefit from Cloudflare's security features

4. **When to Use Each**:
   - Use Pages for:
     - Static site hosting
     - Automatic deployments
     - Asset optimization
   - Use Workers for:
     - Dynamic server-side code
     - API endpoints
     - Custom routing
     - Server-side rendering

### 🔄 Optional: Server-Side Rendering (SSR)

The starter kit uses static rendering by default, but you can enable SSR when needed:

1. **When to Use SSR**:
   - Dynamic content that changes per user
   - User authentication
   - Real-time data
   - Personalized content
   - API routes

2. **How to Enable SSR**:

   ```bash
   # Install the Cloudflare adapter
   npx astro add cloudflare
   ```

   Update `astro.config.mjs`:

   ```js
   import { defineConfig } from 'astro/config';
   import cloudflare from '@astrojs/cloudflare';

   export default defineConfig({
     adapter: cloudflare(),
     output: 'server'  // Enable SSR
   });
   ```

3. **Per-Page SSR**:
   - Add `export const prerender = false` to pages that need SSR
   - Other pages remain static by default
   - Example:

     ```astro
     ---
     export const prerender = false;
     // Your dynamic page code here
     ---
     ```

4. **Deployment Changes**:
   - Update GitHub Actions workflow to use Workers
   - Configure Workers KV for session storage
   - Set up environment variables in Cloudflare

5. **Best Practices**:
   - Start with static rendering
   - Enable SSR only when needed
   - Use static pages for content that doesn't change
   - Use SSR for dynamic features

### 🔧 GitHub Actions for SSR

When enabling SSR, you'll need to update your GitHub Actions workflow. Here's how to modify `.github/workflows/main.yml`:

1. **Add SSR Configuration**:

   ```yaml
   env:
     PROJECT_NAME: ${{ github.event.repository.name }}
     # Add SSR configuration
     ENABLE_SSR: false  # Set to true to enable SSR
   ```

2. **Update Frontend Job**:

   ```yaml
   frontend:
     needs: validate
     runs-on: ubuntu-latest
     steps:
       # ... existing setup steps ...

       - name: Build Frontend
         run: |
           cd astro-frontend
           npm run build
         env:
           NODE_ENV: ${{ env.ENVIRONMENT }}
           # Add SSR-specific environment variables
           VITE_API_URL: ${{ env.ENVIRONMENT == 'production' && secrets.PROD_API_URL || secrets.STAGING_API_URL }}

       - name: Deploy to Cloudflare
         if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
         uses: cloudflare/wrangler-action@v3
         with:
           apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
           accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
           command: ${{ env.ENABLE_SSR == 'true' && 'deploy' || 'pages deploy' }}
           projectName: ${{ env.PROJECT_NAME }}
           directory: astro-frontend/dist
   ```

3. **Required Secrets**:

   ```yaml
   # For static deployment (Pages)
   CLOUDFLARE_API_TOKEN
   CLOUDFLARE_ACCOUNT_ID

   # For SSR deployment (Workers)
   CLOUDFLARE_API_TOKEN
   CLOUDFLARE_ACCOUNT_ID
   CLOUDFLARE_WORKER_NAME  # Optional, defaults to PROJECT_NAME
   ```

4. **Environment-Specific Settings**:

   ```yaml
   # Development
   ENABLE_SSR: false
   CLOUDFLARE_ENVIRONMENT: development

   # Staging
   ENABLE_SSR: true
   CLOUDFLARE_ENVIRONMENT: staging

   # Production
   ENABLE_SSR: true
   CLOUDFLARE_ENVIRONMENT: production
   ```

5. **Best Practices**:
   - Use environment variables to control SSR
   - Keep static deployment as default
   - Test SSR locally before enabling
   - Monitor Worker usage and costs
   - Use appropriate caching strategies

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
