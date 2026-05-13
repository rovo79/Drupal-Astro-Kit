# Publishing Workflow

Editing content in Drupal does not automatically update the live site. You rebuild the Astro site and deploy the output. This is by design.

## The Mental Model

This kit is static-first. The live site is pre-rendered HTML on Cloudflare Pages. Drupal is your authoring tool, not your serving tool.

When you click "Publish" in Drupal, you're marking content as *ready*. Getting it live requires a rebuild and deploy:

```
Edit in Drupal → Save/Publish → Rebuild Astro → Deploy to Pages → Live
```

This gives you full control over exactly what goes live and when. Nothing reaches production without an explicit deploy step.

## Why Rebuild-to-Publish?

This is a deliberate choice, not a limitation.

**What you get:**
- **Control** — You decide what's live. No accidental publishes, no "I saved a draft and it went live."
- **Zero runtime dependencies** — The production site is static HTML. Drupal doesn't need to be running, reachable, or even installed.
- **Preview before deploy** — Run `npm run build` and check `dist/` locally before anything touches production.
- **Simple hosting** — Static files on a CDN. Free tier. No server to maintain.

**The tradeoff:**
Content isn't instant. After editing in Drupal, you run two commands to go live. For a developer-focused starter kit, this is a feature — you control the deploy pipeline — not a bug.

**The alternative** is a live CMS or server-rendered setup where Drupal serves content at request time. That adds runtime infrastructure, hosting costs, and failure modes. This kit chose the opposite: build once, serve forever, rebuild when ready.

## Step-by-Step

### 1. Edit content in Drupal

Open your local Drupal admin:

```
http://<project>.ddev.site/admin/content
```

Create or edit pages. Click "Save" (with status set to "Published").

### 2. Rebuild the Astro site

Make sure Drupal is running, then build:

```bash
cd drupal-backend && ddev start
cd ../astro-frontend && npm run build
```

Astro fetches all published content from Drupal's JSON:API and generates static HTML in `dist/`.

### 3. Deploy

Using the deploy script:

```bash
./scripts/deploy-frontend.sh
```

Or manually:

```bash
cd astro-frontend
npx wrangler pages deploy ./dist --project-name=your-project
```

Your changes are live in seconds.

## Quick Reference

The full publish cycle in three commands:

```bash
cd drupal-backend && ddev start
cd ../astro-frontend && npm run build
cd .. && ./scripts/deploy-frontend.sh
```

## When You Need More

For automated rebuilds, CI/CD pipelines, or server-rendered content, see [docs/future/](future/) for what's possible beyond static-first.

## See Also

- [Deployment Guide](deployment.md) — First-time Cloudflare setup, env vars, troubleshooting
- [Architecture Overview](architecture.md) — How the components connect
