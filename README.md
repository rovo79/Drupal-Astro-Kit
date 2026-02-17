# 🚀 Drupal + Astro + Cloudflare Starter Kit

Local Drupal CMS → Astro Static Site → Cloudflare Pages

This starter kit turns Drupal 11 into a local-only CMS and uses Astro to generate a fully static site that deploys to Cloudflare Pages. You get modern frontend development with the stability of Drupal—but your production site is static, fast, secure, and free to host.

If you want optional server-side rendering (SSR) on Cloudflare Workers, you can enable that in advanced mode. But the default, recommended flow is static-first.

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

Optional (Advanced)

- Cloudflare Workers SSR mode — For hosted-Drupal scenarios
- Workers KV support — For sessions or dynamic endpoints
- CI/CD Ready — GitHub Actions support for both Pages and Workers mode

---

## 📋 Table of Contents

- Features
- Prerequisites
- Quick Start
- Local Development Flow
- Build & Deployment
- Architecture
- Advanced: Workers Mode (Optional)
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

🟧 Optional SSR (Phase 2)

If you later choose to host Drupal somewhere publicly accessible, you can:

- Switch Astro to server mode
- Deploy to Cloudflare Workers instead
- Use live JSON:API reading at request time
- Add previews, authenticated routes, etc.

But the base kit no longer implies that.

---

## 🧰 Prerequisites

Tool | Version | Install
--- | --- | ---
Node.js | 20+ | brew install node@20
DDEV | Latest | brew install ddev/ddev/ddev
Docker | Latest | brew install --cask docker
Composer | Latest | brew install composer
Cloudflare Account | Free | <https://dash.cloudflare.com>

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

1. Run the setup

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

1. Launch local development

```bash
# Start Drupal
cd drupal-backend && ddev start && ddev launch

# Start Astro (in a new terminal)
cd astro-frontend && npm run dev
```

You now have:

- Drupal: <http://my-project.ddev.site>
- Astro: <http://localhost:4321>

---

## 🧱 Local Development Flow

You maintain content in Drupal locally.

Astro reads Drupal using JSON:API only at build time:

```text
Drupal (local)
    ↓ JSON:API
Astro build
    ↓
Static HTML in dist/
    ↓
Cloudflare Pages Hosting
```

There is no Drupal runtime dependency in production.

### Homepage routing

Drupal decides which page is the “front page” via path aliases. Many sites keep the homepage at `/home`, while the public URL you care about is `/`.

Set `HOMEPAGE_ALIAS` in your `.env` file (default: `/home`). During the Astro build we duplicate that alias so both `/home` and `/` point at the same generated HTML. Change the value if your editors pick a different alias for the homepage.

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
- Optional: serve Workers SSR (for advanced mode)

---

## 🧪 Example Drupal → Astro Route

The setup script generates something like:

Files:
- `src/pages/index.astro`
- `src/pages/[...slug].astro`

```astro
---
import { fetchAllPages, pagePathToSegments } from '../lib/drupalClient';

export async function getStaticPaths() {
  const pages = await fetchAllPages();

  return pages.map(page => ({
    params: { slug: pagePathToSegments(page) },
    props: {
      title: page.attributes.title,
      bodyHtml: page.attributes.body?.processed ?? '',
    }
  }));
}

const { title, bodyHtml } = Astro.props;
---

<h1>{title}</h1>
<article set:html={bodyHtml} />
```

This means:

- Astro builds /about, /company/team, etc. based on Drupal aliases
- No fetch at runtime

---

## 🧰 Advanced: Workers Mode (Optional)

If you later decide to host Drupal publicly, you can:

- Switch Astro to Cloudflare SSR adapter
- Enable Workers KV
- Add preview routes
- Add dynamic pages that fetch Drupal live at request time

This requires Drupal to be publicly reachable, which is not part of the default workflow.

Use this mode only if you know you need SSR.

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

Install JSON:API Extras or confirm path field is exposed.

---

## 📝 License

MIT

---

If you’d like, I can also generate:

- A v1 architecture diagram
- The rewritten setup steps for your CLI
- A migration checklist from your current SSR-heavy repo to this SSG-first version

Just say the word.
