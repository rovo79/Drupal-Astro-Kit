# 🚀 Drupal + Astro + Cloudflare Starter Kit

A production-ready starter kit featuring a lightning‑fast Astro frontend on Cloudflare Pages, powered by a robust Drupal 11 backend running via DDEV.

## 🚦 Quick Start

### Prerequisites

- DDEV (for local Drupal development)
- Docker (required by DDEV)
- Node.js (for Astro frontend)
- Composer (for Drupal dependencies)

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
   git add .
   git commit -m "Initial commit"
   git push -u origin main
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

4. Start the development servers:
   - Drupal backend: `ddev launch`
   - Astro frontend: `cd astro-frontend && npm run dev`

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
