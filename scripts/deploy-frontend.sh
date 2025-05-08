#!/usr/bin/env bash
set -e

# Builds and deploys your Astro site to Cloudflare Pages:

cd astro-frontend

# 1. Build
npm run build

# 2. Deploy to Pages
npx wrangler pages deploy ./dist --project-name="$CLOUDFLARE_PAGES_PROJECT"  # :contentReference[oaicite:8]{index=8}

# A one‑liner for CI/CD or manual deploys, so you never forget the build → deploy steps.
# Wrangler Pages publish workflow
