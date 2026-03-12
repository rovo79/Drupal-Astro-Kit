# Roadmap: Drupal_Astro_Kit

## Overview

This is a tightening pass — no new runtime capabilities, just clarity. The repo's architecture is sound but its messaging, docs, and structure blur what is supported versus aspirational. Four phases take it from muddled identity to a clean, unambiguous static-first starter kit: establish identity, reorganize docs, document the publishing workflow, and declare the local-first build model.

## Phases

- [ ] **Phase 1: Identity** - Establish what this repo is (and isn't) across README, AGENTS.md, and repo metadata
- [ ] **Phase 2: Documentation Structure** - Reorganize docs into V1-supported vs future/reference, wall off legacy SSR content
- [ ] **Phase 3: Publishing Workflow** - Document the rebuild-to-publish model as deliberate first-class behavior
- [ ] **Phase 4: Build Source Model** - Declare local-first as the V1 default and label CI/hosted as optional advanced

## Phase Details

### Phase 1: Identity
**Goal**: A developer reading any entry point (README, AGENTS.md, repo description) immediately understands this is a static-first starter kit — not a platform, not an SSR framework, not an editorial CMS
**Depends on**: Nothing (first phase)
**Requirements**: IDEN-01, IDEN-02, IDEN-03
**Success Criteria** (what must be TRUE):
  1. README opens with a clear statement that this is a static-first starter kit for developers
  2. README does not mention SSR, Workers, or edge rendering as current capabilities
  3. AGENTS.md reflects the tightened identity: static-first generator repo, not a platform
  4. Repo description/metadata (GitHub description, package.json if applicable) says "static-first starter kit"
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Rewrite README opening, headers, and framing; remove SSR roadmap section and emoji
- [ ] 01-02-PLAN.md — Tighten AGENTS.md identity, remove outdated ExecPlans, update GitHub repo description

### Phase 2: Documentation Structure
**Goal**: A developer browsing docs/ finds only V1-supported content on the happy path; legacy SSR-era docs are clearly walled off and cannot be mistaken for current guidance
**Depends on**: Phase 1 (identity framing informs doc tone and labels)
**Requirements**: DOCS-01, DOCS-02, DOCS-03
**Success Criteria** (what must be TRUE):
  1. docs/ has a clear organizational split between V1-supported docs and future/reference material
  2. Legacy SSR-era docs (ssr-guide.md, cloudflare-setup.md, github-actions.md, phase-2-workers-ssr.md) are moved to a clearly labeled subdirectory or carry unmissable warnings at the top
  3. A developer following the happy path (README → docs/) never encounters SSR-era content without an explicit "this is not V1" signal
  4. AI-maintained docs (docs/ai/) reflect the tightened V1 architecture and don't reference SSR as current
**Plans**: TBD

Plans:
- [ ] 02-01: Reorganize docs/ directory and wall off legacy content
- [ ] 02-02: Update AI-maintained docs to reflect V1 architecture

### Phase 3: Publishing Workflow
**Goal**: A developer understands exactly how content goes from Drupal to the live site — and understands that rebuild-to-publish is a deliberate design choice, not a limitation
**Depends on**: Phase 2 (docs structure exists for publishing docs to live in)
**Requirements**: PUBL-01, PUBL-02, PUBL-03
**Success Criteria** (what must be TRUE):
  1. A publishing workflow doc exists that describes the full path: edit in Drupal → rebuild Astro → deploy to Pages
  2. The doc states plainly that "publish in Drupal" does not mean "live on the site" — and explains why this is intentional
  3. The canonical deploy command (`npm run build` → `wrangler pages deploy` or `scripts/deploy-frontend.sh`) is documented with copy-pasteable commands
  4. A developer new to the project can find and follow the publishing workflow without guessing
**Plans**: TBD

Plans:
- [ ] 03-01: Write publishing workflow documentation with tradeoff statement

### Phase 4: Build Source Model
**Goal**: A developer knows that local-first (DDEV + local build + manual deploy) is the supported V1 path, and that CI/hosted alternatives exist but are optional advanced territory
**Depends on**: Phase 2 (docs structure exists for build source docs to live in)
**Requirements**: BLDS-01, BLDS-02, BLDS-03
**Success Criteria** (what must be TRUE):
  1. Documentation declares local-first (DDEV + local Astro build + manual deploy) as the V1 default operating model
  2. CI/hosted build paths are labeled as "optional advanced" wherever they appear — not mixed in with the default flow
  3. .env.example reflects local-first as primary (local URLs as defaults, CI/hosted vars clearly marked optional)
  4. A developer setting up for the first time follows a local-first path without encountering CI/hosted instructions as if they were required
**Plans**: TBD

Plans:
- [ ] 04-01: Document local-first build model and update .env.example
- [ ] 04-02: Label CI/hosted paths as optional advanced

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Identity | 1/2 | In progress | - |
| 2. Documentation Structure | 0/2 | Not started | - |
| 3. Publishing Workflow | 0/1 | Not started | - |
| 4. Build Source Model | 0/2 | Not started | - |
