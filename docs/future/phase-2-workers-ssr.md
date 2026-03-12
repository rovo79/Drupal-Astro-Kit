# Phase 2 (Optional): Cloudflare Workers + SSR

**Status:** planning / optional. The default kit is **static-first** (Astro `output: 'static'` + Cloudflare Pages). Nothing in `./setup.sh` currently provisions Workers SSR.

## When SSR makes sense

Use SSR when you need any of the following:

- Drupal is hosted somewhere reachable from the internet (or at least from Workers), and you want to fetch content at request time
- Preview mode (draft content) without rebuilding the whole site
- Authenticated/personalized pages
- Very large sites where SSG build times become painful

If you only need a brochure/docs site, stick with SSG + Pages.

## What changes in Phase 2

Static-first (today):

- Drupal: local-only CMS (DDEV)
- Astro: fetches Drupal JSON:API during `npm run build`, emits `dist/`
- Hosting: Cloudflare Pages serves static files

SSR (Phase 2):

- Drupal: hosted somewhere reachable
- Astro: `output: 'server'` + Cloudflare adapter, runs on Workers
- Hosting: Workers runtime serves HTML; assets served via Workers/Pages assets binding

## High-level migration checklist

1. **Expose Drupal JSON:API publicly**
   - Ensure anonymous read access is appropriate (or implement auth).
   - Ensure CORS / allowed origins are correct for production.

2. **Switch Astro to SSR**
   - Add Cloudflare adapter to `astro-frontend/`.
   - Change `astro.config.mjs` to `output: 'server'`.
   - Decide whether SSR is global or per-page (`export const prerender = true/false`).

3. **Provision Workers config**
   - Add `wrangler.toml` (Workers) and any bindings (KV/D1/etc) required for sessions/previews.
   - Add environment variables/secrets in Cloudflare dashboard.

4. **Update deploy pipeline**
   - Replace Pages deploy (`wrangler pages deploy ./dist`) with Workers deploy (`wrangler deploy`).
   - CI/CD should no longer assume a fully-static `dist/` output.

5. **Define a preview/auth model**
   - Decide how editors authenticate (Drupal user/session, token, OAuth, etc).
   - Decide where preview state is stored (KV, cookies, signed URLs).

## Relationship to existing docs

The repo currently contains SSR/Workers-oriented docs that predate the static-first default:

- `docs/ssr-guide.md`
- `docs/cloudflare-setup.md`
- `docs/github-actions.md`

These should be treated as **draft/legacy reference** until they’re updated to match the Phase 2 plan above.

