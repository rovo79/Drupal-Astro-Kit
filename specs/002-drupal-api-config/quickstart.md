# Quickstart — Drupal Headless JSON:API Profile (V1 Minimal)

Follow these steps to validate the feature end-to-end after cloning the repo.

## 1) One-time setup

```sh
# From repo root
chmod +x setup.sh && ./setup.sh
```

What this does:

- Creates `.env` from `.env.example` and sets `PROJECT_NAME`
- Provisions Drupal (DDEV) and installs core with JSON:API enabled
- Scaffolds Astro (`astro-frontend/`) with Cloudflare adapter
- Generates `wrangler.toml` in repo root


## 2) Verify Drupal JSON:API endpoint

```sh
# Replace with your project from .env
PROJECT_NAME=$(grep '^PROJECT_NAME=' .env | cut -d= -f2)
BASE="http://${PROJECT_NAME}.ddev.site/jsonapi"

# List published pages (empty array is OK before creating content)
curl -s "$BASE/node/page?filter[status]=1&sort=-changed" | jq '.data | length'
```

## 3) Create sample content (optional but recommended)

```sh
cd drupal-backend
# Create a page node via Drush eval (simplified example)
ddev drush eval '\
  $node = \Drupal\node\Entity\Node::create(["type"=>"page","title"=>"Hello JSON:API","status"=>1]);\
  $node->set("field_slug","hello-jsonapi");\
  $node->set("field_summary","Intro page");\
  $node->set("field_body","This is the body.");\
  $node->save();\
  echo $node->id();\
'
cd -
```

Re-run the curl from step 2 and confirm `.data` includes your page.

## 4) Start Astro dev and load API check

```sh
cd astro-frontend
npm run dev
# Open http://localhost:4321/api-check in your browser
```

The page should fetch from `/jsonapi/node/page?filter[status]=1` and display results with `jsona` deserialization.

## 5) CORS preflight check (Workers dev domain)

```sh
# Simulate a preflight request for Workers dev origin
ORIGIN="https://${PROJECT_NAME}.workers.dev"
URL="http://${PROJECT_NAME}.ddev.site/jsonapi"

curl -s -o /dev/null -D - -X OPTIONS "$URL" \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" | sed -n '1,20p'
```

Expect `Access-Control-Allow-Origin` to echo your origin and appropriate `Access-Control-Allow-Methods/Headers`.

## 6) Deploy frontend to Workers (optional)

```sh
# Build and deploy
zsh scripts/deploy-frontend.sh
# Then visit https://${PROJECT_NAME}.workers.dev
```

Troubleshooting: see `/docs/troubleshooting.md`.
