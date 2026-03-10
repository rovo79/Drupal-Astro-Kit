# 🚀 Drupal + Astro + Cloudflare Starter Kit

Local Drupal CMS → Astro Static Site → Cloudflare Pages

This starter kit turns Drupal 11 into a local-only CMS and uses Astro to generate a fully static site that deploys to Cloudflare Pages. You get modern frontend development with the stability of Drupal—but your production site is static, fast, secure, and free to host.

This is built for Drupal developers who want to escape Twig templating hell and ship modern frontends with minimal friction.

---

## 🌟 What You Get

Core (Static-first)

- Astro Static Frontend — Pre-rendered pages, built locally, deployed to Cloudflare Pages
- Local Drupal 11 CMS — Fully managed inside DDEV
- Instant Bootstrap — One interactive CLI creates both Drupal and Astro projects
- Type-Safe API Access — jsona + drupal-jsonapi-params
- Simple Build Pipeline — Build locally, deploy static output
- Clean Routing — Drupal aliases mapped to Astro routes
- Zero Runtime Dependencies — Production site does not require Drupal at all

---

## 📋 Table of Contents

- Features
- Prerequisites
- Quick Start
- Local Development Flow
- Build & Deployment
- Architecture
- Project Structure
- Troubleshooting

---

## ✨ Features

🟩 Static-first (default)

This kit assumes:

- Drupal lives locally
- Astro fetches content at build time only
- Cloudflare Pages serves a static site
- No SSR dependency on Drupal in production

🟩 One-command Bootstrap

The interactive CLI:

- Creates a Drupal 11 project under DDEV
- Installs JSON:API, CORS configuration, and a starter content type
- Creates an Astro project
- Wires Drupal → Astro environment variables
- Generates example routes that map Drupal aliases into Astro pages

🟩 Modern Frontend for Drupal

Astro replaces Twig entirely.

Use React/Svelte/Solid/Vue islands if you want interactivity.

🟩 Clean Separation

- Drupal → content
- Astro → presentation
- Cloudflare Pages → hosting

---

## 🧰 Prerequisites

Tool | Version | Install
--- | --- | ---
Node.js | 20+ | brew install node@20
DDEV | Latest | brew install ddev/ddev/ddev
Docker | Latest | brew install --cask docker
Composer | Latest | brew install composer
Cloudflare Account | Free | <https://dash.cloudflare.com> (deployment only)

Important: In static mode, Drupal does not need to be hosted anywhere. It only needs to run locally when building the Astro site.

---

## 🚦 Quick Start

1. Clone this kit and initialize your project

```bash
git clone https://github.com/rovo79/Drupal_Astro_Kit.git my-project
cd my-project
git remote remove origin
```

Add your own GitHub repo:

```bash
git remote add origin https://github.com/your-user/my-project.git
```

2. Run the setup

```bash
chmod +x setup.sh
./setup.sh
```

This will:

- Create drupal-backend/ in DDEV
- Create astro-frontend/
- Configure .env
- Map Drupal’s JSON:API into Astro
- Generate working SSG routes: `src/pages/index.astro` + `src/pages/[...slug].astro`

3. (Optional) Seed sample pages

```bash
./scripts/seed-content.sh
```

This creates published Basic pages with stable aliases: `/home`, `/about`, `/contact`.
These seeded Basic pages (and any new Basic page you save) get aliases automatically through the `pathauto.pattern.page` configuration created during setup. Manual alias editing is only needed for other content types or special cases.

4. Launch local development

```bash
# Start Drupal
cd drupal-backend && ddev start && ddev launch

# Start Astro
# When setup finishes, you are asked “Start Astro dev now in this terminal?”
# Say yes to reuse this terminal, or decline and run `cd astro-frontend && npm run dev` later.
```

You now have:

- Drupal: <http://my-project.ddev.site>
- Astro: <http://localhost:4321>

---

## 🧱 Local Development Flow

You maintain content in Drupal locally.

Astro reads Drupal using JSON:API during `npm run dev` and `npm run build` to determine routes and render HTML. The deployed static site does not fetch Drupal at runtime.

```text
Drupal (local)
    ↓ JSON:API
Astro build
    ↓
Static HTML in dist/
    ↓
Cloudflare Pages Hosting
```

### Content updates

- Editing an existing Basic page only requires saving in Drupal and refreshing the browser while `npm run dev` is running; the dev server pulls the latest JSON:API data on navigation.
- Creating a new route or alias (new page or a different path) needs a fresh build (`npm run build`) so Astro can regenerate the static HTML that includes the new route.

There is no Drupal runtime dependency in production.

### Homepage routing

Drupal decides which page is the “front page” via path aliases. Many sites keep the homepage at `/home`, while the public URL you care about is `/`.

Set `HOMEPAGE_ALIAS` in your `.env` file (default: `/home`). The Astro homepage route (`src/pages/index.astro`) will render:

- a Drupal page with alias `/` if one exists, otherwise
- the Drupal page matching `HOMEPAGE_ALIAS`

That means your homepage content is authored once in Drupal (usually at `/home`) and appears at both `/` and `/home` in Astro.

---

## 📦 Build & Deployment

### Prerequisites for Deployment

1. **Cloudflare Account**: Sign up at [dash.cloudflare.com](https://dash.cloudflare.com)
2. **API Token**: Create one with "Cloudflare Pages" permissions
3. **Account ID**: Found in your Cloudflare dashboard URL

Add these to your `.env` file:

```bash
CLOUDFLARE_API_TOKEN=your-api-token-here
CLOUDFLARE_ACCOUNT_ID=your-account-id-here
```

### Building the Static Site

Before building, make sure your local Drupal is running:

```bash
cd drupal-backend && ddev start
```

Then build the Astro site:

```bash
cd astro-frontend
npm run build
```

This will:

1. Connect to your local Drupal's JSON:API
2. Fetch all published pages
3. Generate static HTML in `dist/`

### Deploying to Cloudflare Pages

**Option 1: Using the deploy script (recommended)**

```bash
./scripts/deploy-frontend.sh
```

This builds and deploys in one command.

**Option 2: Manual deployment with Wrangler**

```bash
cd astro-frontend
npm run build
npx wrangler pages deploy ./dist --project-name=my-project
```

**Option 3: Cloudflare Dashboard (drag-and-drop)**

1. Go to Cloudflare Dashboard → Pages
2. Click "Create a project" → "Direct Upload"
3. Drag the `astro-frontend/dist` folder

### First-Time Deployment

On first deploy, you may need to create the Pages project:

```bash
npx wrangler pages project create my-project
```

Then run the deploy script again.

### Updating Your Site

To update content:

1. Edit pages in Drupal at `http://my-project.ddev.site/admin/content`
2. Run `./scripts/deploy-frontend.sh` to rebuild and deploy

Your changes will be live in seconds!

---

## 🧬 Architecture

Drupal responsibilities

- WYSIWYG content
- Fields, media, menus
- JSON:API output
- URL aliases (Pathauto)

Astro responsibilities

- Fetch pages from Drupal at build time
- Build static HTML from templates
- Handle routing using Drupal aliases
- Add interactivity using islands if desired

Cloudflare responsibilities

- Serve static site globally
- Serve static output via Pages CDN

---

## 🧪 Example Drupal → Astro Route

The setup script generates something like:

Files:
- `src/pages/index.astro`
- `src/pages/[...slug].astro`

```astro
---
import { getAllPages, aliasToSlug } from '../lib/drupal';

export async function getStaticPaths() {
  const pages = await getAllPages();

  return pages
    .filter((page) => page.path?.alias && page.path.alias !== '/')
    .map((page) => ({
      params: { slug: aliasToSlug(page.path!.alias)! },
      props: { page },
    }));
}

const { page } = Astro.props;
---

<h1>{page.title}</h1>
<article set:html={page.body?.processed ?? ''} />
```

This means:

- Astro builds /about, /company/team, etc. based on Drupal aliases
- No fetch at runtime

---

## 📁 Project Structure

```plaintext
my-project/
├── astro-frontend/         # Astro SSG frontend
│   ├── src/
│   ├── dist/
│   ├── astro.config.mjs
│   └── package.json
├── drupal-backend/         # Drupal 11 CMS under DDEV
│   ├── .ddev/
│   └── web/
├── setup/                  # Interactive Ink-based installer
│   ├── cli.js
│   └── ui.js
├── setup.sh                # Bootstrap script
├── .env                    # Created during setup
└── README.md               # You are here
```

---

## 🩺 Troubleshooting

Astro cannot reach Drupal during build

Ensure DDEV is running:

```bash
cd drupal-backend
ddev start
```

Visit <https://my-project.ddev.site/jsonapi> to confirm.

Cloudflare build fails

Cloudflare cannot reach your local Drupal. You must build locally, then deploy static output.

Aliases not appearing in JSON:API

This kit expects published **Basic pages** to have a **URL alias** (e.g. `/about`). The Astro routes are generated from `path.alias` returned by JSON:API (not from `/node/123` internal URLs).

---

## 📝 License

MIT

---

## 🔮 Roadmap (Phase 2: Workers SSR)

This kit is intentionally **static-first** (Pages + SSG). If you need SSR (host Drupal somewhere reachable, add previews/auth, fetch at request time), see:

- `/Users/rob/Dev/Drupal_Astro_Kit/docs/phase-2-workers-ssr.md`
