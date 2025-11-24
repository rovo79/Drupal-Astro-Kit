# Research Findings — Drupal Headless JSON:API Profile (V1 Minimal)

This document consolidates decisions to resolve all NEEDS CLARIFICATION items from the plan, plus best practices and integration patterns relevant to this feature.

## Decisions

### D-001: V1 Performance Goals

- Decision: Prioritize correctness and DX; no numeric performance SLOs for V1. Measure informally using curl and browser devtools.
- Rationale: V1 establishes a working baseline (functional API + CORS). Performance tuning depends on real content and CDN configuration, deferred to V2+.
- Alternatives considered:
  - Define p95 < 200ms for cached responses in V1 — rejected due to variability in developer machines and lack of CDN.
  - Add automated benchmarking — deferred until endpoints and data model stabilize.

### D-002: Scale/Scope for V1

- Decision: Target "developer validation scale" — O(10–100) nodes; single frontend consumer; anonymous reads only.
- Rationale: Keeps focus on data model clarity and cross-origin access; avoids premature scaling.
- Alternatives considered:
  - Production-scale targets (100k nodes, multi-tenant) — out-of-scope for V1.

### D-003: Node.js and Tooling Versions

- Decision: Node.js 20.x (matches Workers dev and Astro guidance). Wrangler v3. Astro Cloudflare adapter in advanced mode.
- Rationale: Aligns with constitution and existing setup.
- Alternatives considered: Node 18 LTS — acceptable but not preferred; Node 22 — too new for some plugins.

### D-004: JSON:API Consumption Libraries

- Decision: Use `jsona` for deserialization and `drupal-jsonapi-params` for query building in Astro frontend.
- Rationale: These are lightweight, proven libs; match docs and examples in repo.
- Alternatives considered: Manual parsing and string building — higher error risk and boilerplate.

### D-005: CORS Policy Scope for V1

- Decision: Allow only two origins: `http://localhost:4321` (dev) and `https://<project>.workers.dev` (Workers dev). Methods: GET, OPTIONS. Headers: Content-Type, Authorization (future-proof), Accept.
- Rationale: Minimal yet sufficient for anonymous fetches; tighter security posture for V1.
- Alternatives considered: Wildcard `*` — rejected (security). Credentials-enabled CORS — deferred to V2 (auth flows).

### D-006: Content Modeling Conventions

- Decision: Standardize on `page` content type with fields: `field_slug` (plain text), `field_summary` (text), `field_body` (text_long). Title is core.
- Rationale: Predictable shapes map cleanly to frontend objects; demonstrates convention.
- Alternatives considered: Use `article` in V1 — less generic for many projects.

## Best Practices (Dependencies)

- Drupal JSON:API:
  - Prefer sparse fieldsets and sorting to minimize payloads (e.g., `fields[node--page]=title,field_slug,field_summary,field_body&sort=-changed`).
  - Use `filter[status]=1` for anonymous content.
- DDEV/Drush:
  - Programmatically create content type and fields via Drush eval in setup scripts to avoid manual steps.
- Astro + Cloudflare:
  - Keep SSR default (`output: 'server'`); consider `prerender` only for static routes.
  - Use Workers `compatibility_flags = ["nodejs_compat"]` for Node APIs.
- Security:
  - Restrict JSON:API access for anonymous to published nodes only; avoid exposing user resources.

## Integration Patterns

- Drupal → Astro:
  - Build queries with `drupal-jsonapi-params` and fetch in Astro frontmatter; deserialize with `jsona`.
  - Example: `/jsonapi/node/page?filter[status]=1&fields[node--page]=title,field_slug,field_summary,field_body&sort=-changed`.
- Astro → Workers:
  - Access runtime via `Astro.locals.runtime.env`; KV binding `SESSION` available (not used by this feature).
- Config Derivation:
  - Compute API base URL from `.env` PROJECT_NAME: `http://{PROJECT_NAME}.ddev.site/jsonapi`.

## Open Items Resolved

- Performance Goals: Resolved by D-001 (no numeric SLOs in V1).
- Scale/Scope: Resolved by D-002 (developer validation scale).

## References

- Repo docs: `/docs/architecture.md`, `/docs/ssr-guide.md`, `/docs/cloudflare-setup.md`
- Constitution: `/.specify/memory/constitution.md`
