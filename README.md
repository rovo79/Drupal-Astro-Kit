# 🚀 Drupal + Astro + Cloudflare Starter Kit

A production-ready starter kit featuring a lightning‑fast Astro frontend on Cloudflare Pages, powered by a robust Drupal 11 backend running via DDEV.

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
   - `Cloudflare Pages Read` and `Cloudflare Pages Edit` (for Pages deployment)
   - `Workers KV Storage Read` and `Workers KV Storage Edit` (for KV namespaces)
   - `Workers Scripts Read` and `Workers Scripts Edit` (for Workers)
   - `Workers Routes Read` and `Workers Routes Edit` (for routing)

   **Zone-level permissions** (if using custom domains):
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

   ```bash
   # Clone the starter kit
   git clone https://github.com/yourusername/Drupal_Astro_Kit.git your-project-name
   cd your-project-name

   # Remove the original remote and set up your new repository
   git remote remove origin

   # Create a new repository on GitHub first, then:
   git remote add origin https://github.com/your-username/new-repo-name.git
   ```

2. Make the setup scripts executable:

   ```bash
   chmod +x scripts/*.sh
   ```

3. Run the setup scripts in sequence (note the use of `source` to ensure environment variables are properly shared):

   ```bash
   # First, source the environment sync script
   source scripts/env-sync.sh

   # Then run the DDEV setup
   source scripts/setup-ddev.sh

   # Finally, setup the Astro frontend
   source scripts/setup-astro.sh
   ```

4. After the setup is complete, commit and push your changes:

   ```bash
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

   ```
   ✅ .env created from .env.example and updated with project-specific values
   📝 Project name: your-project-name
   🌐 Drupal API URL: http://your-project-name.ddev.site/jsonapi
   ```

2. From `setup-ddev.sh`:

   ```
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

   ```
   ==> Setting up Astro frontend for project: your-project-name
   ...
   ✅ Astro frontend setup complete!
   Next steps:
   1. Run 'npm run dev' to start the development server
   2. Your project is configured for Cloudflare Pages deployment
   3. Environment variables are set up from your .env file

   Important:
   1. You'll need to create a KV namespace in Cloudflare
   2. The image service is configured for Cloudflare compatibility
   3. Update the KV namespace ID in wrangler.toml
   ```

### Cloudflare Setup

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
   npx wrangler kv:namespace list

   # Test your KV namespace (optional)
   npx wrangler kv:key put --binding=SESSION "test" "value"
   npx wrangler kv:key get --binding=SESSION "test"
   ```

4. Development Notes:
   - When using `npm run dev`, the Astro development server will use a local version of KV
   - For production, your KV namespace will be automatically used
   - The SESSION binding is used by Astro's Cloudflare adapter for session management
   - You can manage your KV data through the Cloudflare Dashboard at:
     [Workers & Pages > KV](https://dash.cloudflare.com/?to=/:account/workers/kv/namespaces)

5. Troubleshooting:
   - If you see "Invalid binding `SESSION`" in your build output, verify your KV namespace ID
   - For local development, use `npx wrangler dev --remote` to connect to your Cloudflare KV
   - Check the [Cloudflare KV documentation](https://developers.cloudflare.com/kv/get-started/) for more details

## 📚 Documentation

- [Deployment Guide](docs/deployment.md) - How to deploy your site
- [SSR Guide](docs/ssr-guide.md) - Server-side rendering configuration
- [GitHub Actions](docs/github-actions.md) - CI/CD workflow details
- [Cloudflare Setup](docs/cloudflare-setup.md) - Cloudflare configuration
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions

## 🏗️ Project Structure

```
my-saas-kit/
├── astro-frontend/          # Astro frontend
├── drupal-backend/          # Drupal backend
├── scripts/                 # Setup and utility scripts
├── docs/                    # Documentation
├── wrangler.toml           # Cloudflare configuration
├── .env.example            # Environment template
└── README.md               # This file
```

## 🔧 Development

### Local Development

- Drupal Backend: `http://drupal-backend.ddev.site`
- Astro Frontend: `http://localhost:4321`

### Available Scripts

- `scripts/env-sync.sh` - Sync environment variables
- `scripts/setup-ddev.sh` - Setup Drupal backend
- `scripts/setup-astro.sh` - Setup Astro frontend
- `scripts/deploy-frontend.sh` - Deploy frontend to Cloudflare

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
