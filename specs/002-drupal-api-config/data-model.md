# Data Model — Drupal Headless JSON:API Profile (V1 Minimal)

This document captures entities, fields, relationships, and validation rules for V1.

## Entities

### Node: Page (node--page)

- Fields:
  - title (string, required)
  - field_slug (string, unique within content type, required)
  - field_summary (string, optional)
  - field_body (string, long text, optional)
- Relationships: none in V1
- Validation:
  - field_slug: lowercase kebab-case recommended, no spaces; unique per bundle
  - Anonymous access limited to published nodes only (`status = 1`)

### CORS Policy Configuration

- Allowed Origins (exact):
  - `http://localhost:4321`
  - `https://<project>.workers.dev`
- Allowed Methods: GET, OPTIONS
- Allowed Headers: Content-Type, Accept, Authorization
- Credentials: false (V1)
- Location: `web/sites/default/services.yml` generated/updated by setup script

### Permission Set

- Anonymous role:
  - "Access content" permission enabled (view published content)
  - No user entity access via JSON:API
- Authenticated role: no changes in V1

## API Shape (JSON:API)

- Base URL: `http://{PROJECT_NAME}.ddev.site/jsonapi`
- Endpoint: `/jsonapi/node/page`
- Query Parameters (examples):
  - `filter[status]=1` (published only)
  - `fields[node--page]=title,field_slug,field_summary,field_body` (sparse fieldset)
  - `sort=-changed` (most recently updated first)

## Notes

- Advanced resource customization (jsonapi_extras) is deferred to V2+.
- Additional content types (article, taxonomy) deferred to V2+.
