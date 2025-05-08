#!/usr/bin/env bash
set -e

# Check for required tools
for cmd in npm npx; do
  if ! command -v $cmd &> /dev/null; then
    echo "Error: '$cmd' is not installed or not in your PATH."
    exit 1
  fi
done

# Bootstraps a fresh Astro frontend with the Cloudflare adapter:

# 1. Create the Astro project
npm create astro@latest astro-frontend -- --template basics

# 2. Install Cloudflare adapter
cd astro-frontend
npm install --save-dev wrangler
npx astro add cloudflare

# 3. Ensure wrangler.toml exists in project root
cd ..
if [ ! -f wrangler.toml ]; then
  npx wrangler pages download config
fi

cd astro-frontend

# 4. Copy example env
cp ../.env.example .env

echo "✅ Astro project ready in ./astro-frontend"

# Ensures your Astro build is wired for Pages (via @astrojs/cloudflare) automatically.
