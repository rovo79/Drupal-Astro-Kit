# 🚀 Drupal + Astro + Cloudflare Starter Kit

A production-ready starter kit featuring a lightning‑fast Astro frontend on Cloudflare Pages, powered by a robust Drupal 11 backend running via DDEV.

## 🚦 Quick Start

### Prerequisites

- DDEV (for local Drupal development)
- Docker (required by DDEV)
- Node.js (for Astro frontend)
- Composer (for Drupal dependencies)

### Installation

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
   scripts/env-sync.sh
   scripts/setup-ddev.sh
   scripts/setup-astro.sh
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
