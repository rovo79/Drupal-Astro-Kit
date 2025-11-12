# 🚀 Drupal + Astro + Cloudflare Starter Kit

[![CI/CD Pipeline](https://github.com/rovo79/Drupal_Astro_Kit/actions/workflows/deploy.yml/badge.svg)](https://github.com/rovo79/Drupal_Astro_Kit/actions/workflows/deploy.yml)

A production-ready starter kit featuring an Astro frontend on Cloudflare Workers, powered by a Drupal 11 backend running via DDEV.

## 📋 Table of Contents

- [What You Get](#-what-you-get)
- [Prerequisites](#prerequisites)
- [Quick Start](#-quick-start)
- [Cloudflare Setup](#cloudflare-setup)
- [Documentation](#-documentation)
- [Project Structure](#️-project-structure)
- [Development](#-development)
- [Project Audit Suite](#-project-audit-suite)
- [Common Troubleshooting](#-common-troubleshooting)

## ✨ What You Get

- **Astro SSR Frontend** - Server-side rendering on Cloudflare Workers with edge distribution
- **Drupal 11 Backend** - Headless CMS with JSON:API, managed via DDEV
- **Instant Setup** - Interactive CLI installer configures everything in one command
- **KV Session Storage** - Built-in session management with Workers KV
- **CI/CD Ready** - GitHub Actions workflows for automated deployment
- **Type-Safe API** - `jsona` + `drupal-jsonapi-params` for structured Drupal data
- **Comprehensive Audit Suite** - Validates setup, SSR, API, KV, CI/CD, and docs

## 🚦 Quick Start

### Prerequisites

### Prerequisites

| Requirement | Version | Installation |
|------------|---------|--------------|
| **Node.js** | 20+ | `brew install node@20` |
| **DDEV** | Latest | `brew install ddev/ddev/ddev` |
| **Docker** | Latest | `brew install --cask docker` |
| **PHP** | 8.3+ | Managed by DDEV |
| **Composer** | Latest | `brew install composer` |
| **Wrangler CLI** | v3+ | `npm install -g wrangler` |
| **Cloudflare Account** | Free tier+ | [Sign up here](https://dash.cloudflare.com/sign-up) |

### Installation

1. Clone the repository and set up your project:

   ```zsh
   # Clone the starter kit
   git clone https://github.com/rovo79/Drupal_Astro_Kit.git your-project-name
   cd your-project-name

   # IMPORTANT: Project names must use hyphens (not underscores) for valid hostnames
   # Good: my-project, rovomedia-com
   # Bad:  my_project, rovomedia_com

   # Remove the original remote and set up your new repository
   git remote remove origin

   # Create a new repository on GitHub first, then:
   git remote add origin https://github.com/your-username/new-repo-name.git
   ```

2. Run the setup script:

   ```zsh
   chmod +x setup.sh
   ./setup.sh
   ```

3. After the setup is complete, commit and push your changes:

   ```zsh
   # Add all the new files created during setup
   git add .
   git commit -m "Initial project setup"
   git push -u origin main
   ```

4. Start the development servers:
   - Drupal backend: `ddev launch`
   - Astro frontend: `cd astro-frontend && npm run dev`

### Cloudflare Setup

#### 1. API Token Configuration

Before deploying to Cloudflare Workers, set up your API token:

1. Go to [Cloudflare Dashboard > API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token" → "Create Custom Token"
3. Set the following permissions:

   **Account-level permissions:**
   - `Workers Scripts Read` and `Workers Scripts Edit` (for Workers deployment)
   - `Workers KV Storage Read` and `Workers KV Storage Edit` (for KV namespaces)

   **Zone-level permissions** (if using custom domains):
   - `Workers Routes Read` and `Workers Routes Edit` (for routing)
   - `DNS Read` and `DNS Write` (for DNS management)
   - `SSL and Certificates Read` and `SSL and Certificates Write` (for HTTPS)

   **Optional but recommended:**
   - `Account Analytics Read` (for monitoring)
   - `Account Settings Read` (for configuration)

4. Set the token's TTL (Time To Live) according to your security requirements
5. Create the token and copy it securely
6. Add the token to your `.env` file as `CLOUDFLARE_API_TOKEN`

⚠️ **Security Note:** Keep your API token secure and never commit it to version control. The `.env` file is automatically added to `.gitignore`.

#### 2. KV Namespace Setup

Create a KV namespace for session management:

```bash
# Create a namespace for sessions
npx wrangler kv namespace create "SESSION"

# The command will output something like:
# 🌀  Creating namespace with title your-project-name-SESSION
# ✨  Success!
# Add the following to your configuration file:
# [[kv_namespaces]]
# binding = "SESSION"
# id = "<BINDING_ID>"
```

Update `wrangler.toml` in your project root:

```toml
[[kv_namespaces]]
binding = "SESSION"
id = "<BINDING_ID>"  # Replace with the ID from the command output
```

#### 3. Verify Your Setup

```bash
# Verify your Cloudflare credentials
npx wrangler whoami

# List your KV namespaces
npx wrangler kv namespace list

# Test your KV namespace (optional)
npx wrangler kv key put --binding=SESSION "test" "value"
npx wrangler kv key get --binding=SESSION "test"
```

#### 4. Development & Deployment

**Local Development:**
```bash
# For local dev with live KV access (recommended for KV testing)
npx wrangler dev --remote

# For local dev without KV (faster, but SESSION binding won't work)
cd astro-frontend && npm run dev
```

**Production Deployment:**
```bash
# Deploy using the provided script
zsh scripts/deploy-frontend.sh

# Or deploy manually
cd astro-frontend && npx wrangler deploy
```

Your site will be available at: `https://your-project-name.your-subdomain.workers.dev`

💡 **Note:** Use `npx wrangler dev --remote` when testing features that require KV storage. The standard `npm run dev` runs Astro's dev server locally without Workers runtime.

### Environment Variables

The following environment variables are configured during setup:

| Variable | Set By | Description |
|----------|--------|-------------|
| `PROJECT_NAME` | `setup.sh` | Your project name (derived from directory name) |
| `DRUPAL_JSONAPI_URL` | `setup.sh` | Full URL to Drupal JSON:API endpoint |
| `ASTRO_DEV_URL` | Manual | Astro dev server URL (default: `http://localhost:4321`) |
| `WORKERS_DEV_URL` | Manual | Wrangler dev server URL (default: `http://localhost:8787`) |
| `CLOUDFLARE_ACCOUNT_ID` | Manual | Your Cloudflare account ID (from dashboard) |
| `CLOUDFLARE_API_TOKEN` | Manual | API token for Workers deployment |

After running `./setup.sh`, update your `.env` file with the manual entries before deploying to Cloudflare.

### Expected Output

After running the setup scripts, you should see:

1. From `env-sync.sh`:

   ```zsh
   ✅ .env created from .env.example and updated with project-specific values
   📝 Project name: your-project-name
   🌐 Drupal API URL: http://your-project-name.ddev.site/jsonapi
   ```

2. From `setup-ddev.sh`:

   ```zsh
   ==> Checking dependencies...
   ==> Setting up Drupal backend for project: your-project-name
   ...
   ✅ Drupal backend setup complete!
   Next steps:
   1. Run 'ddev launch' to open your Drupal site
   2. Your project name is: your-project-name
   3. DDEV site URL: http://your-project-name.ddev.site
   ```

3. From `setup-astro.sh`:

   ```bash
   ==> Setting up Astro frontend for project: your-project-name
   ...
   ✅ Astro frontend setup complete!
   Next steps:
   1. Run 'npm run dev' to start the development server
   2. Your project is configured for Cloudflare Workers deployment (SSR)
   3. Environment variables are set up from your .env file

   Cloudflare Setup Required:
   1. Create a KV namespace: npx wrangler kv namespace create "SESSION"
   2. Update wrangler.toml with your namespace ID
   3. Verify setup: npx wrangler kv:namespace list

   Development Notes:
   1. For local development with Workers: npx wrangler dev
   2. The SESSION binding is available for session management
   3. Observability is enabled for monitoring and debugging
   4. SSR is enabled - pages render on-demand in Workers
   ```

## Astro Frontend Requirements

The Astro frontend expects the following packages to be installed:

- [jsona](https://www.npmjs.com/package/jsona)
- [drupal-jsonapi-params](https://www.npmjs.com/package/drupal-jsonapi-params)

These are installed automatically by `setup-astro.sh`, but if you set up manually, run:

   ```zsh
   npm install jsona drupal-jsonapi-params
   ```

## 📚 Documentation

- [Deployment Guide](docs/deployment.md) - How to deploy your site to Cloudflare Workers
- [SSR Guide](docs/ssr-guide.md) - Server-side rendering with Workers configuration
- [GitHub Actions](docs/github-actions.md) - CI/CD workflow for Workers deployment
- [Cloudflare Setup](docs/cloudflare-setup.md) - Workers and KV configuration
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions

## 🏗️ Project Structure

```plaintext
Drupal_Astro_Kit/          # Root directory (your project name)
├── wrangler.toml          # Cloudflare Workers config (lives at root)
├── .env                   # Environment variables (generated by setup)
├── .env.example           # Environment template
├── setup.sh               # Main setup script
├── astro-frontend/        # Astro frontend (created by setup)
│   ├── src/               # Astro components and pages
│   ├── dist/              # Build output (contains _worker.js/)
│   └── package.json       # Frontend dependencies
├── drupal-backend/        # Drupal backend (created by setup)
│   ├── .ddev/             # DDEV configuration
│   └── web/               # Drupal web root
├── scripts/               # Automation scripts
│   ├── deploy-frontend.sh # Deploy to Workers
│   └── setup-mcp.sh       # MCP server setup
├── setup/                 # Interactive setup CLI
│   ├── cli.js             # CLI entry point
│   └── ui.js              # Ink-based UI
├── audit/                 # Project audit suite
│   └── scripts/           # Audit modules
└── docs/                  # Documentation
    ├── architecture.md
    ├── deployment.md
    └── ...
```

**Note:** `astro-frontend/` and `drupal-backend/` directories are created by the setup script and not committed to the repository.

## 🔧 Development

### Local Development

- Drupal Backend: `http://your-project-name.ddev.site`
- Astro Frontend (dev): `http://localhost:4321`
- Astro Frontend (Cloudflare Workers dev): `http://localhost:8787`

### Production Deployment

To deploy your frontend to Cloudflare Workers:

```bash
# Deploy using the provided script
zsh scripts/deploy-frontend.sh

# Or deploy manually
cd astro-frontend
npx wrangler deploy
```

Your site will be available at: `https://your-project-name.your-subdomain.workers.dev`

### Cloudflare Workers Features

This starter kit leverages several Cloudflare Workers capabilities:

- **Server-Side Rendering (SSR)**: Pages render on-demand in Workers
- **KV Storage**: Session management and caching with Workers KV
- **Edge Computing**: Global distribution with minimal latency
- **Observability**: Built-in monitoring and logging
- **Serverless Primitives**: Ready for D1, R2, and other Workers services

### Available Scripts

- `setup.sh` - The main setup script for the project.
- `scripts/deploy-frontend.sh` - Deploy frontend to Cloudflare Workers

## 🔍 Project Audit Suite

A comprehensive audit tool validates your setup, SSR configuration, API integration, KV storage, CI/CD pipeline, and documentation accuracy.

### Running Audits

```bash
cd audit
npm install  # One-time setup

# Run all audits
node index.js

# Run specific audit target
node index.js --target setup
node index.js --target ssr
node index.js --target api
node index.js --target kv
node index.js --target ci
node index.js --target docs

# Generate enhanced reports
node scripts/generate-report.js
```

### Audit Targets

| Target | Purpose | Checks |
|--------|---------|--------|
| **setup** | Project initialization | .env, wrangler.toml, required commands, Drupal reachability |
| **ssr** | SSR parity | Astro dev vs Workers dev rendering consistency |
| **api** | JSON:API integration | Drupal connectivity, jsona deserialization |
| **kv** | KV namespace | SESSION namespace read/write/delete cycle |
| **ci** | CI/CD pipeline | GitHub Actions workflow validation, required jobs |
| **docs** | Documentation drift | Path references, config mentions, link validation |

### Reports

Audit results generate two files:

- `audit/report/audit-report.json` - Detailed findings, recommendations, metadata
- `audit/report/audit-report.md` - Human-readable summary with actionable steps

## � Common Troubleshooting

### Setup Issues

**DDEV won't start:**
```bash
# Check Docker is running
docker ps

# Restart DDEV
cd drupal-backend && ddev restart
```

**Permission errors during setup:**
```bash
# Make setup script executable
chmod +x setup.sh

# Check Node.js version (requires 20+)
node --version
```

### Development Issues

**"Cannot find module" errors in Astro:**
```bash
# Reinstall dependencies
cd astro-frontend && rm -rf node_modules && npm install

# Verify jsona and drupal-jsonapi-params are installed
npm list jsona drupal-jsonapi-params
```

**KV binding not working in local dev:**
```bash
# Use --remote flag to access live KV
npx wrangler dev --remote

# Verify KV namespace exists
npx wrangler kv namespace list
```

### Deployment Issues

**"Invalid binding `SESSION`" error:**
```bash
# Check wrangler.toml has correct KV namespace ID
cat wrangler.toml | grep -A 2 kv_namespaces

# Recreate namespace if needed
npx wrangler kv namespace create "SESSION"
```

**Build fails with "Cannot find module":**
```bash
# Clear build cache and rebuild
cd astro-frontend
rm -rf dist .astro
npm run build
```

**API requests failing from Workers:**
- Verify `DRUPAL_JSONAPI_URL` in `.env` is accessible from internet
- Check CORS settings in Drupal (see [docs/troubleshooting.md](docs/troubleshooting.md))
- Use `npx wrangler tail` to view live Worker logs

For comprehensive troubleshooting, see [docs/troubleshooting.md](docs/troubleshooting.md).

## �📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
