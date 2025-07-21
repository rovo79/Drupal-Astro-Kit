# Project: Drupal + Astro + Cloudflare Starter Kit

## Project Overview:

This is a starter kit for building decoupled websites with a Drupal backend (managed by DDEV), an Astro frontend, and automated deployment to Cloudflare Workers via GitHub Actions.

The key technologies are:
- **Backend:** Drupal 11 (via DDEV)
- **Frontend:** Astro (with SSR)
- **Deployment:** Cloudflare Workers
- **CI/CD:** GitHub Actions
- **Configuration:** `wrangler.toml`, `.env`

## General Instructions:

- When generating new code, please follow the existing structure and conventions for shell scripts, Astro components, and configuration files.
- Ensure any new functionality is documented, either in the relevant `README.md` or the `/docs` directory.
- When modifying setup scripts, ensure they remain robust and provide clear, color-coded feedback to the user.

## Coding Style & Conventions:

- **Shell Scripts (`scripts/*.sh`):**
  - Use `#!/usr/bin/env bash`.
  - Use the existing color variables (`RED`, `GREEN`, `YELLOW`, `NC`) for user output.
  - Use helper functions like `print_status` and `print_error` for consistency.
  - Check for required dependencies (e.g., `ddev`, `npm`) before executing main logic.

- **Astro (`astro-frontend/`):**
  - Follow Astro best practices for component structure and data fetching.
  - The project is configured for Server-Side Rendering (`output: 'server'`). Keep this in mind when creating new pages.
  - Use environment variables for configuration (e.g., `DRUPAL_API_URL`).

- **Configuration (`wrangler.toml`, `astro.config.mjs`):**
  - Keep configurations clean and well-commented.
  - When adding new Cloudflare bindings (KV, D1, etc.), update `wrangler.toml` and ensure the setup instructions in the documentation are also updated.

## Specific Component Guidance:

- **`setup.sh` & `setup/`:** The initial project setup is handled by `setup.sh`, which runs an interactive CLI tool built with Ink. The core logic resides in `setup/cli.js` and `setup/ui.js`. Changes to the setup flow should be made within the `setup/` directory.

- **`scripts/`:** This directory contains utility scripts like `deploy-frontend.sh`. The main setup scripts have been replaced by the interactive installer.

- **`wrangler.toml`:** This is the primary configuration for the Cloudflare Worker. It defines the project name, entry point (`main`), asset bindings, and KV namespaces. It is dynamically configured by the setup scripts.

- **`docs/`:** This directory contains the user-facing documentation. If you add or change a feature (e.g., add a new Cloudflare service, change a deployment step), please update the relevant markdown file (`deployment.md`, `cloudflare-setup.md`, etc.).

- **GitHub Actions (`.github/workflows/`):**
  - The CI/CD pipeline automates testing and deployment.
  - Workflows should handle both `staging` and `main` branches.
  - Secrets (e.g., `CLOUDFLARE_API_TOKEN`) are expected to be present in the repository settings.

## Regarding Dependencies:

- **Astro:** Add frontend dependencies using `npm install` inside the `astro-frontend` directory.
- **Drupal:** Add backend dependencies using `ddev composer require` inside the `drupal-backend` directory.
- Justify the need for any new external dependencies.