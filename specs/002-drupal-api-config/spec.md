# Feature Specification: Drupal Headless JSON:API Profile (V1 Minimal)

**Feature Branch**: `002-drupal-api-config`  
**Created**: November 14, 2025  
**Updated**: November 18, 2025  
**Status**: Implementation  
**Scope**: V1 delivers a minimal opinionated headless profile with core JSON:API, basic CORS, and a single `page` content type. Advanced features (jsonapi_extras, caching optimization, additional content types) are deferred to future iterations.

**Original Input**: "Core + contrib modules for API ergonomics - JSON:API Extras, CORS, performance, security, and operational tooling for production-ready Drupal backend"

## V1 Scope

**Included in V1:**

- Core `jsonapi` module (no extras)
- Single content type: `page` with fields: title, field_slug, field_summary, field_body
- Basic CORS configuration for `http://localhost:4321` and `https://<project>.workers.dev`
- Anonymous access to published content only
- Automatic setup via bootstrap script (zero manual steps)
- Guaranteed working endpoint: `/jsonapi/node/page?filter[status]=1&sort=-changed`

**Deferred to V2+:**

- jsonapi_extras (custom paths, field aliases, resource disabling)
- Additional content types (article, taxonomy)
- Performance optimization (cache tuning, CDN rules)
- Advanced security (field-level permissions, user entity restrictions)
- Config Split for environment-specific settings
- Admin UI tooling (admin_toolbar, devel modules)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Frontend Developer Consumes Working API Endpoints (Priority: P1) ✅ V1

A frontend developer building an Astro application needs to fetch content from Drupal's JSON:API with a predictable, working endpoint immediately after setup with zero manual configuration.

**Why this priority**: This is the foundational requirement - without a guaranteed working API endpoint, the frontend cannot consume backend data, blocking all downstream work.

**V1 Scope**: Core JSON:API with standard Drupal paths (`/jsonapi/node/page`). Custom paths and field aliases via jsonapi_extras are deferred to V2+.

**Independent Test**: Run setup script, create a page node in Drupal, fetch via `curl "http://<project>.ddev.site/jsonapi/node/page?filter[status]=1"`, verify JSON response contains the page data.

**Acceptance Scenarios (V1)**:

1. **Given** the setup script has completed, **When** a frontend developer fetches `/jsonapi/node/page?filter[status]=1&sort=-changed`, **Then** the response includes published page nodes with title, field_slug, field_summary, field_body fields.

2. **Given** a page content type exists with consistent field naming (field_slug, field_summary, field_body), **When** the frontend uses jsona and drupal-jsonapi-params libraries, **Then** the response deserializes cleanly to JavaScript objects.

3. **Given** the Astro starter includes the api-check.astro page, **When** a developer visits `http://localhost:4321/api-check`, **Then** the page successfully fetches and displays page nodes without errors.

**Deferred to V2+ (jsonapi_extras)**:

- Custom resource paths (e.g., `/api/posts` instead of `/jsonapi/node/article`)
- Field name aliases (e.g., "hero" instead of "field_hero_image")
- Selective resource disabling for content types

---

### User Story 2 - Frontend Application Accesses API Cross-Origin (Priority: P1) ✅ V1

An Astro frontend running on a different origin (localhost:4321 or workers.dev domain) needs to make anonymous requests to the Drupal API without CORS blocking the requests.

**Why this priority**: Without CORS configuration, the frontend cannot communicate with the backend at all, making this equally critical to P1.

**V1 Scope**: Fixed origins for development and Workers dev (`http://localhost:4321`, `https://<project>.workers.dev`). Wildcard patterns and production custom domains are deferred to V2+.

**Independent Test**: Start the Astro dev server, make a fetch request to the Drupal JSON:API endpoint, and verify the response includes proper CORS headers allowing the request.

**Acceptance Scenarios (V1)**:

1. **Given** the Astro frontend runs at `http://localhost:4321`, **When** it makes a GET request to the Drupal JSON:API at `http://<project>.ddev.site/jsonapi`, **Then** the response includes `Access-Control-Allow-Origin: http://localhost:4321` header.

2. **Given** CORS is configured for Workers dev domain `https://<project>.workers.dev`, **When** a preflight OPTIONS request is sent, **Then** the response includes appropriate `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers`.

3. **Given** CORS configuration is written to `web/sites/default/services.yml` by the bootstrap script, **When** the script runs, **Then** allowed origins derive from the PROJECT_NAME environment variable.

**Deferred to V2+**:

- Wildcard origin patterns (security risk in V1; requires validation layer)
- Production custom domain support beyond .workers.dev
- Credential-supporting CORS for authenticated requests

---

### User Story 3 - Anonymous Users Experience Fast API Responses (Priority: P2) 🔄 DEFERRED TO V2+

Anonymous users browsing the frontend need API responses to load quickly through effective caching strategies, both at the Drupal level and CDN level.

**Why this priority**: Performance is critical for user experience, but the API must be functional first (P1) before optimization.

**V1 Status**: Deferred. Drupal core's default caching for JSON:API is adequate for initial validation. Explicit cache tuning and CDN rules are non-essential for proving the endpoint works.

**Independent Test**: Make repeated anonymous requests to the same JSON:API endpoint and verify cache headers indicate proper caching with cache tags for invalidation.

**Acceptance Scenarios**:

1. **Given** Internal Page Cache and Dynamic Page Cache are enabled, **When** an anonymous user requests `/jsonapi/node/article`, **Then** the response includes `Cache-Control: max-age=3600` and appropriate `X-Drupal-Cache-Tags` headers.

2. **Given** Cloudflare CDN caching rules are configured, **When** multiple requests are made to `/jsonapi/*` endpoints, **Then** subsequent requests are served from CDN cache with `CF-Cache-Status: HIT`.

3. **Given** content is updated in Drupal, **When** cache tags are properly configured, **Then** related cached API responses are automatically invalidated.

---

### User Story 4 - API Administrator Secures Exposed Endpoints (Priority: P2) 🔄 DEFERRED TO V2+

A DevOps engineer or site administrator needs to ensure that sensitive data is not exposed through JSON:API and that anonymous users can only access intended public content.

**Why this priority**: Security is essential but assumes the API is already functional and being used (P1 complete).

**V1 Status**: Deferred for advanced hardening. V1 establishes baseline security: anonymous users can only access published content (via permissions), but comprehensive security audit (user entity restrictions, field-level permissions, form disabling) is deferred to V2+.

**Independent Test**: Attempt to access user email addresses, unpublished content, and admin-only fields through JSON:API as an anonymous user, and verify all are properly restricted.

**Acceptance Scenarios**:

1. **Given** user entities have email addresses, **When** an anonymous user requests `/jsonapi/user/user`, **Then** email fields are not included in the response or the endpoint returns 403.

2. **Given** a content item is unpublished, **When** an anonymous user requests that specific node via JSON:API, **Then** the API returns 403 Forbidden.

3. **Given** the /user/register and /user/login forms are disabled, **When** a user attempts to access those paths, **Then** requests return 403 or redirect appropriately.

---

### User Story 5 - Content Editor Models API-Friendly Content (Priority: P3) 🔄 DEFERRED TO V2+

Content editors and site builders need to create content types with consistent field naming and structure that translates cleanly to API consumption patterns.

**Why this priority**: This is a content modeling best practice that improves maintainability but doesn't block initial functionality.

**V1 Status**: Deferred for additional content types. V1 provides a single opinionated `page` content type with consistent field naming (field_slug, field_summary, field_body) as a reference implementation. Additional content types (article, taxonomy integration) are deferred to V2+.

**Independent Test**: Create a new content type following naming conventions (field_hero_image, field_teaser), add content, and verify the JSON:API response reflects the structured field names.

**Acceptance Scenarios**:

1. **Given** a content type uses consistent field naming (field_hero_image, field_teaser, field_published_date), **When** the frontend requests those fields, **Then** the response structure is predictable and self-documenting.

2. **Given** taxonomy terms are used for categorization, **When** the frontend needs to filter content by category, **Then** the taxonomy relationship is cleanly exposed through JSON:API with sparse fieldsets.

---

### User Story 6 - Developer Manages Configuration as Code (Priority: P3) 🔄 DEFERRED TO V2+

A developer deploying the Drupal site to production needs all API-related configuration (JSON:API Extras settings, permissions, CORS rules) to be exportable and version-controlled.

**Why this priority**: Configuration management is important for team collaboration and deployment but doesn't affect initial feature functionality.

**V1 Status**: Deferred. V1 uses programmatic creation via bootstrap script (content type, fields, permissions created with Drush PHP eval) rather than CMI import. CORS is managed via services.yml (not part of Drupal's config management). Full CMI workflow and Config Split are deferred to V2+.

**Independent Test**: Export configuration after setting up JSON:API Extras and CORS, commit to git, deploy to a fresh environment, import config, and verify all settings are restored.

**Acceptance Scenarios**:

1. **Given** JSON:API Extras resource customizations are configured, **When** `drush config:export` is run, **Then** configuration files for all customizations are exported to the sync directory.

2. **Given** configuration is in git, **When** a fresh environment imports the config with `drush config:import`, **Then** all JSON:API Extras settings, permissions, and CORS rules are applied identically.

---

### Edge Cases

**V1 Note**: V1 relies on Drupal core's default error handling for edge cases. Explicit validation and custom error responses are deferred to V2+.

- What happens when a JSON:API request includes invalid filter syntax or references non-existent fields?
- ~~How does the system handle requests for resources that exist in Drupal but are explicitly disabled in JSON:API Extras?~~ (V2+ - jsonapi_extras deferred)
- What happens when an authenticated user's session expires mid-request from the frontend? (V2+ - auth flows deferred)
- How are deeply nested includes (3+ levels) handled for performance? (V2+ - performance tuning deferred)
- What happens when CDN cache and Drupal cache disagree on freshness? (V2+ - CDN integration deferred)
- How does the system handle malformed CORS preflight requests or origin headers?

## Requirements *(mandatory)*

### Functional Requirements

#### JSON:API Customization (V2+ - requires jsonapi_extras)

- **FR-001** *(V2+)*: System SHOULD allow administrators to customize JSON:API resource paths to create clean, semantic URLs (e.g., `/api/posts` instead of `/jsonapi/node/article`). *V1 uses core paths only.*
- **FR-002** *(V2+)*: System SHOULD allow administrators to selectively disable JSON:API resources for content types or entities that should not be exposed. *V1 exposes single page content type only.*
- **FR-003** *(V2+)*: System SHOULD allow administrators to rename fields in JSON:API responses to remove Drupal-internal naming (e.g., "hero" instead of "field_hero_image"). *V1 uses Drupal field names (field_slug, field_summary, field_body).*
- **FR-004** *(V2+)*: System SHOULD allow administrators to control which content type bundles are exposed through JSON:API on a per-bundle basis. *V1 has single bundle; bundle control deferred.*

#### Cross-Origin Resource Sharing

- **FR-005** ✅ *(V1)*: System MUST support configuring CORS headers to allow specific frontend origins to access JSON:API endpoints. *V1 implements via services.yml with fixed origins derived from PROJECT_NAME.*
- **FR-006** ✅ *(V1)*: System MUST handle preflight OPTIONS requests with appropriate `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers` responses. *V1 supports GET and OPTIONS methods.*
- **FR-007** *(V2+)*: System SHOULD support wildcard origin patterns for development environments while restricting to specific domains in production. *V1 uses fixed origins only per constitution config-driven principle (wildcards require validation layer and increase security risk).*
- **FR-008** *(V2+)*: System SHOULD allow configuration of credential-supporting CORS for authenticated API requests. *V1 focuses on anonymous access; credentials support deferred.*

#### Performance & Caching (V2+ - optimization deferred)

- **FR-009** *(V2+)*: System SHOULD enable Internal Page Cache for anonymous user requests to JSON:API endpoints. *V1 uses Drupal core defaults; explicit tuning deferred.*
- **FR-010** *(V2+)*: System SHOULD enable Internal Dynamic Page Cache for authenticated user requests. *V1 focuses on anonymous access.*
- **FR-011** *(V2+)*: System SHOULD include appropriate Cache-Control headers in JSON:API responses with configurable max-age values. *V1 relies on core defaults.*
- **FR-012** *(V2+)*: System SHOULD include X-Drupal-Cache-Tags headers to support cache invalidation strategies. *V1 core includes these; validation deferred.*
- **FR-013** *(V2+)*: System SHOULD support CDN caching rules for `/jsonapi/*` paths with query string-based cache keys. *V1 has no CDN integration.*

#### Security

- **FR-014** ⚠️ *(V1 baseline, V2+ comprehensive)*: System MUST prevent exposure of sensitive user data (emails, passwords, tokens) through JSON:API. *V1 baseline: anonymous permissions grant content access only; comprehensive user entity audit deferred to V2+.*
- **FR-015** ✅ *(V1)*: System MUST restrict anonymous users to viewing only published content through JSON:API. *V1 implements via 'access content' permission for anonymous role.*
- **FR-016** *(V2+)*: System SHOULD allow administrators to disable user registration and login forms when frontend handles authentication. *V1 has no auth flows; form disabling deferred.*
- **FR-017** ⚠️ *(V1 baseline, V2+ audit)*: System MUST validate that all JSON:API permissions align with Drupal's node access system. *V1 baseline: permissions grant published content access; comprehensive audit deferred.*
- **FR-018** *(V2+)*: System SHOULD disable unnecessary serialization formats (HAL, REST) to reduce attack surface when only JSON:API is used. *V1 does not explicitly disable; assessment deferred.*

#### Content Modeling

- **FR-019** ✅ *(V1)*: Content types MUST use consistent field naming conventions (e.g., field_slug, field_summary, field_body) for API predictability. *V1 implements single page content type with consistent naming as reference.*
- **FR-020** ⚠️ *(V1 core support, V2+ validation)*: System MUST support sparse fieldsets allowing frontends to request specific fields via `fields[type]=field1,field2` syntax. *V1 core supports this; explicit testing deferred to V2+.*
- **FR-021** *(V2+)*: System SHOULD support compound documents via `include` parameter for related entities (e.g., `include=field_image.field_media_image`). *V1 has no related entities; validation deferred.*

#### Configuration Management (V2+ - CMI workflow deferred)

- **FR-022** *(V2+)*: System SHOULD allow export of all JSON:API Extras configurations via Drush config:export. *V1 has no jsonapi_extras; CMI workflow deferred.*
- **FR-023** *(V2+)*: System SHOULD allow export of CORS configuration via Drupal's configuration system. *V1 CORS managed via services.yml (not part of CMI).*
- **FR-024** *(V2+)*: System SHOULD allow export of permissions related to JSON:API via configuration management. *V1 creates permissions programmatically via bootstrap script; CMI export deferred.*
- **FR-025** *(V2+)*: System SHOULD support Config Split for environment-specific configurations (dev CORS origins vs. production). *V1 uses single services.yml; Config Split deferred.*

#### Operational Tooling (V2+ - admin UX deferred)

- **FR-026** *(V2+)*: System SHOULD provide administrative UI for managing JSON:API Extras settings without requiring code changes. *V1 has no jsonapi_extras; admin UI deferred.*
- **FR-027** *(V2+)*: System SHOULD provide administrative toolbar access for content editors on development environments. *V1 uses core Drupal admin; admin_toolbar module deferred.*
- **FR-028** *(V2+)*: System SHOULD include development tools (Devel module) on non-production environments for debugging API responses. *V1 focuses on working endpoint; devel module deferred.*

### Key Entities *(include if feature involves data)*

- **JSON:API Resource Configuration**: Represents customizations for each Drupal entity type/bundle exposed via JSON:API, including path overrides, field name aliases, and enabled/disabled status.

- **CORS Policy Configuration**: Represents allowed origins, methods, headers, and credential settings for cross-origin requests, with environment-specific overrides.

- **Content Type Field Schema**: Represents the standardized field naming conventions and relationships for content types designed for API consumption.

- **Cache Policy**: Represents caching rules including max-age, cache tags, cache contexts, and CDN-level caching configurations for API endpoints.

- **Permission Set**: Represents role-based access control for JSON:API resources, including view/edit/delete permissions per entity type and bundle.

## Success Criteria *(mandatory)*

### Measurable Outcomes

**V1 Success Criteria:**

- **SC-001** ✅ *(V1)*: Frontend developers can fetch content from the page content type using `/jsonapi/node/page` endpoint immediately after running `./setup.sh` with zero manual configuration.

- **SC-002** ✅ *(V1)*: Cross-origin requests from the Astro frontend succeed on first attempt after setup with zero browser console errors for `http://localhost:4321` and `https://<project>.workers.dev` origins.

- **SC-005** ⚠️ *(V1 baseline)*: Zero sensitive user data (emails, tokens, PII) is exposed through JSON:API endpoints to anonymous users. *V1 baseline: anonymous can only access published nodes; comprehensive security audit deferred to V2+.*

- **SC-008** ✅ *(V1)*: Setup script (`./setup.sh`) completes successfully and produces a working `/jsonapi/node/page?filter[status]=1&sort=-changed` endpoint without manual intervention.

**V2+ Success Criteria (Deferred):**

- **SC-003** *(V2+)*: Anonymous API responses achieve 95%+ CDN cache hit rate for repeated requests to the same endpoints. *V1 has no CDN integration.*

- **SC-004** *(V2+)*: JSON:API response sizes are reduced by 40% or more through sparse fieldsets compared to default full responses. *V1 baseline uses core; optimization via jsonapi_extras deferred.*

- **SC-006** *(V2+)*: Configuration export includes 100% of API-related settings, enabling identical reproduction in fresh environments. *V1 uses programmatic creation; CMI workflow deferred.*

- **SC-007** *(V2+)*: API endpoint response times are under 200ms for cached anonymous requests and under 500ms for authenticated requests at 50th percentile. *V1 aspirational; no performance validation implemented.*

## Assumptions

- **A-001**: The project uses DDEV for local development and Drupal 11 as the backend CMS.
- **A-002**: The frontend is an Astro application deployed to Cloudflare Workers.
- **A-003**: Cloudflare is available for CDN caching and WAF rules in production.
- **A-004**: Composer is the package manager for adding Drupal contrib modules.
- **A-005**: Drush is available for configuration import/export operations.
- **A-006**: The primary use case is anonymous content consumption with optional authenticated editing.
- **A-007**: JSON:API is the preferred API format over legacy REST or GraphQL modules.
- **A-008**: Standard HTTP Basic Auth or OAuth2 will be used for authenticated requests if needed.
- **A-009**: Content editors have basic Drupal field configuration knowledge.
- **A-010**: Redis or Memcache services can be added to DDEV for advanced caching if needed.
