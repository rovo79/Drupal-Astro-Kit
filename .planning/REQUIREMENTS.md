# Requirements: Drupal_Astro_Kit

**Defined:** 2026-03-11
**Core Value:** A developer can go from zero to a deployed static site backed by Drupal in one setup command, with clean separation between content authoring, static rendering, and hosting.

## v1 Requirements

Requirements for this tightening pass. Each maps to roadmap phases.

### Identity

- [x] **IDEN-01**: README states this is a static-first starter kit for developers, not a platform or SSR framework
- [x] **IDEN-02**: AGENTS.md reflects the tightened identity and operating model
- [x] **IDEN-03**: Repo description/metadata aligns with static-first starter kit identity

### Documentation

- [x] **DOCS-01**: Docs are reorganized into "supported V1" vs "future/reference" with clear separation
- [x] **DOCS-02**: Legacy SSR-era docs (`ssr-guide.md`, `cloudflare-setup.md`, `github-actions.md`) are moved or clearly walled off from the happy path
- [x] **DOCS-03**: AI-maintained docs (`docs/ai/`) reflect the tightened V1 architecture

### Publishing

- [x] **PUBL-01**: Publishing workflow is documented — editor publishes in Drupal, developer rebuilds and deploys, static output updates
- [x] **PUBL-02**: The tradeoff is stated plainly: Drupal publish does not equal live publish, and that is deliberate
- [x] **PUBL-03**: The deploy flow (`npm run build` → `wrangler pages deploy`) is documented as the canonical publish path

### Build Source

- [x] **BLDS-01**: Local-first (DDEV + local build + manual deploy) is documented as the V1 default operating model
- [x] **BLDS-02**: CI/hosted build path is labeled as optional advanced, not the happy path
- [x] **BLDS-03**: Environment variables and `.env.example` reflect local-first as primary

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Environment Strategy

- **ENVR-01**: Formal environment contract (local/staging/prod URLs, secrets per environment)
- **ENVR-02**: Preview/staging Drupal environments defined

### Content Contracts

- **CONT-01**: Supported content types formally defined with required fields
- **CONT-02**: Alias requirements documented as API contract
- **CONT-03**: API shape Astro relies on is formalized

### Observability

- **OBSV-01**: Build failure output is clear and actionable
- **OBSV-02**: Deployed build metadata visible (commit, timestamp, API base used)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Workers SSR / edge rendering | No concrete need; adds complexity without value for V1 |
| Webhook-driven rebuild orchestration | Premature automation; manual rebuild is fine for starter kit |
| Real-time preview for editors | Requires hosted Drupal and runtime rendering |
| Multi-environment CI pipeline | Local-first is the V1 model |
| Content API contract formalization | Defer until content model grows beyond simple pages |
| Build observability / freshness timestamps | Useful but not part of tightening pass |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| IDEN-01 | Phase 1: Identity | Complete |
| IDEN-02 | Phase 1: Identity | Complete |
| IDEN-03 | Phase 1: Identity | Complete |
| DOCS-01 | Phase 2: Documentation Structure | Complete |
| DOCS-02 | Phase 2: Documentation Structure | Complete |
| DOCS-03 | Phase 2: Documentation Structure | Complete |
| PUBL-01 | Phase 3: Publishing Workflow | Complete |
| PUBL-02 | Phase 3: Publishing Workflow | Complete |
| PUBL-03 | Phase 3: Publishing Workflow | Complete |
| BLDS-01 | Phase 4: Build Source Model | Complete |
| BLDS-02 | Phase 4: Build Source Model | Complete |
| BLDS-03 | Phase 4: Build Source Model | Complete |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-11*
*Last updated: 2026-03-12 after Phase 4 completion — all v1 requirements complete*
