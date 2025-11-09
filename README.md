# 🚀 Drupal + Astro + Cloudflare Starter Kit

A production-ready starter kit featuring an Astro frontend on Cloudflare Workers, powered by a Drupal 11 backend running via DDEV.

## 🚦 Quick Start

### Prerequisites

- DDEV (for local Drupal development)
- Docker (required by DDEV)
- Node.js (for Astro frontend)
- Composer (for Drupal dependencies)
- Cloudflare account (for frontend deployment)

### Cloudflare Setup

Before running the setup scripts, you'll need to create a Cloudflare API token with specific permissions:

1. Go to [Cloudflare Dashboard > API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Choose "Create Custom Token"
4. Set the following permissions:

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

5. Set the token's TTL (Time To Live) according to your security requirements
6. Create the token and copy it securely
7. Add the token to your `.env` file as `CLOUDFLARE_API_TOKEN`

Note: Keep your API token secure and never commit it to version control. The `.env` file is automatically added to `.gitignore`.

### Installation

1. Clone the repository and set up your project:

   ```zsh
   # Clone the starter kit
   git clone https://github.com/yourusername/Drupal_Astro_Kit.git your-project-name
   cd your-project-name

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

4. After the setup is complete, commit and push your changes:

   ```zsh
   # Add all the new files created during setup
   git add .
   git commit -m "Initial project setup"
   git push -u origin main
   ```

5. Start the development servers:
   - Drupal backend: `ddev launch`
   - Astro frontend: `cd astro-frontend && npm run dev`

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

### Cloudflare Workers Setup (Optional)

1. Create a KV Namespace:

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

2. Update `wrangler.toml`:
   - Open `wrangler.toml` in your project root
   - Replace the placeholder KV namespace configuration with your actual namespace ID:

     ```toml
     [[kv_namespaces]]
     binding = "SESSION"
     id = "<BINDING_ID>"  # Replace with the ID from step 1
     ```

3. Verify Your Setup:

   ```bash
   # Verify your Cloudflare credentials
   npx wrangler whoami

   # List your KV namespaces
   npx wrangler kv namespace list

   # Test your KV namespace (optional)
   npx wrangler kv key put --binding=SESSION "test" "value"
   npx wrangler kv key get --binding=SESSION "test"
   ```

4. Development Notes:
   - For local development with Workers: `npx wrangler dev`
   - For production deployment: `npx wrangler deploy`
   - Your site will be available at `https://your-project-name.your-subdomain.workers.dev`
   - The SESSION binding is available for session management in your Astro components
   - Observability is enabled - check Workers Logs in the Cloudflare Dashboard
   - SSR is enabled by default - pages render on-demand in Workers
   - You can manage your KV data through the Cloudflare Dashboard at:
     [Workers & Pages > KV](https://dash.cloudflare.com/?to=/:account/workers/kv/namespaces)

5. Troubleshooting:
   - If you see "Invalid binding `SESSION`" in your build output, verify your KV namespace ID
   - For local development, use `npx wrangler dev --remote` to connect to your Cloudflare KV
   - Check the [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/) for more details
   - For KV-specific help, see the [KV documentation](https://developers.cloudflare.com/kv/get-started/)

## 📚 Documentation

- [Deployment Guide](docs/deployment.md) - How to deploy your site to Cloudflare Workers
- [SSR Guide](docs/ssr-guide.md) - Server-side rendering with Workers configuration
- [GitHub Actions](docs/github-actions.md) - CI/CD workflow for Workers deployment
- [Cloudflare Setup](docs/cloudflare-setup.md) - Workers and KV configuration
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions

## 🏗️ Project Structure

```plaintext
my-saas-kit/
├── astro-frontend/          # Astro frontend
├── drupal-backend/          # Drupal backend
├── scripts/                 # Setup and utility scripts
├── docs/                    # Documentation
├── wrangler.toml           # Cloudflare Workers configuration
├── .env.example            # Environment template
└── README.md               # This file
```

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

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
