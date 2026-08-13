# WND Disaster Event Recipe Design

**Date:** 2026-08-13  
**Status:** Approved design, implementation not started  
**Target repository:** `rovo79/Drupal-Astro-Kit`  
**Recipe package:** `wnd/wnd-disaster-event`  
**Recipe machine name:** `wnd_disaster_event`

## 1. Purpose

WorldNaturalDisasters needs a durable structured-content model whose atomic public unit is a detailed disaster event record. The Drupal recipe defined by this document creates that domain model inside Drupal_Astro_Kit without turning Drupal into the public runtime.

Drupal remains the canonical local content store and editorial interface. Astro remains the presentation layer and consumes Drupal through JSON:API at build time. Static output remains the deployment artifact.

The design deliberately follows Drupal's native strengths: revisionable content entities, entity references, taxonomy, Media, Views, Paragraphs for embedded value objects, and JSON:API.

## 2. Core domain model

The public-site atom is the **Disaster Event**.

The evidence atom is the **Observation**.

The canonical chain is:

```text
Event
  -> Occurrence
      -> Observation
          -> Source
```

Supporting relationships enrich this chain rather than replace it:

```text
Event
  -> Hazard Type
  -> Place
  -> Media
  -> External Identifier
  -> Related Event

Observation
  -> Metric
  -> Source
  -> Media
  -> Place / geometry
```

### 2.1 Event

A coherent disaster as users understand it historically and editorially.

Examples:

- 2026 Western Colombia Earthquake
- Hurricane Katrina
- 2011 Tōhoku Earthquake and Tsunami, if modeled as one editorial event

The Event is the only v0.1 domain object expected to have a public standalone Astro route.

### 2.2 Occurrence

A physical episode within an Event.

Examples:

- main shock
- aftershock
- landfall
- eruption pulse
- flood peak
- major wildfire expansion

Occurrences are first-class revisionable records because they can receive multiple measurements, external identifiers, corrections, and observations over time.

### 2.3 Observation

A sourced assertion about an Event or Occurrence at a specific point in time.

Examples:

- 104 confirmed fatalities
- magnitude reported as Mw 7.4
- airport operations suspended
- 15 km depth reported by a seismic agency
- evacuation ordered for a named zone

Observations are intentionally broader than numeric measurements. They are the unified provenance-bearing unit for both structured metrics and meaningful situation updates.

### 2.4 Source

A reusable **citable evidence item** supporting one or more Observations.

Examples include:

- an official situation report
- a scientific event record or feed item
- an NGO assessment
- a government statement
- a dataset record
- a news report

A Source is not merely an organization. The publishing organization is recorded as Source metadata. This keeps Observation provenance tied to the actual evidence item that made the assertion.

## 3. Drupal representations

### 3.1 First-class node bundles

Create four node types:

- `wnd_event`
- `wnd_occurrence`
- `wnd_observation`
- `wnd_source`

All four use Drupal's normal node revision system.

Only `wnd_event` is treated as publicly routable by the initial Astro implementation. The other bundles exist for editorial management, API traversal, provenance, filtering, and future uses.

### 3.2 Taxonomy vocabularies

Create three core vocabularies:

- `wnd_hazard_type`
- `wnd_metric`
- `wnd_place`

#### `wnd_hazard_type`

Hierarchical hazard classification.

The design supports parent/child classification such as:

```text
Geophysical
  -> Earthquake

Hydrological
  -> Flood
      -> Flash flood

Meteorological
  -> Tropical cyclone
```

The production recipe creates the vocabulary and field configuration but does not attempt to ship a comprehensive global hazard-term corpus in v0.1.

#### `wnd_metric`

Hierarchical canonical measurable concepts referenced by Observations.

Example hierarchy:

```text
Human impact
  -> Fatalities
  -> Injured
  -> Missing
  -> Displaced

Seismic
  -> Magnitude
  -> Depth

Built environment
  -> Buildings damaged
  -> Buildings destroyed
```

Metric terms carry:

| Field | Type | Cardinality | Notes |
|---|---|---:|---|
| `field_wnd_metric_code` | String | 1 | Required stable editorial/API key, e.g. `fatalities` |
| `field_wnd_default_unit` | String | 1 | Optional display/default unit |

The taxonomy hierarchy provides metric grouping, so v0.1 does not create a separate metric-category field.

A metric is not represented as a dedicated Event field. This avoids hard-coding every possible disaster measurement into the Event bundle.

#### `wnd_place`

Reusable named disaster-relevant geography that benefits from Drupal-managed identity and reuse.

Examples:

- Cali
- Chocó
- a watershed
- a volcano
- an evacuation zone
- a named coastal region

Place terms carry:

| Field | Type | Cardinality | Notes |
|---|---|---:|---|
| `field_wnd_place_type` | List text | 1 | `city`, `region`, `feature`, `zone`, `other` |
| `field_wnd_location` | Geofield | 1 | Optional representative point/geometry |
| `field_wnd_country` | Address country-capable field | 1 | Optional normalized country |

Countries are not modeled as `wnd_place` taxonomy terms solely to recreate a country list.

## 4. Event schema

The `wnd_event` bundle contains durable event identity, lifecycle, classification, geography, relationships, and selected media.

| Field | Type / representation | Cardinality | Notes |
|---|---|---:|---|
| `title` | Core node title | 1 | Canonical event title |
| `field_wnd_short_title` | String | 1 | Optional compact display title |
| `field_wnd_summary` | Long text | 1 | Authoritative orientation summary |
| `field_wnd_status` | List text | 1 | Required editorial lifecycle state |
| `field_wnd_hazard_type` | Taxonomy reference -> `wnd_hazard_type` | 1 | Required primary hazard |
| `field_wnd_secondary_hazards` | Taxonomy reference -> `wnd_hazard_type` | unlimited | Cascading / secondary hazards |
| `field_wnd_start_at` | Datetime | 1 | Required event start |
| `field_wnd_end_at` | Datetime | 1 | Optional event end |
| `field_wnd_detected_at` | Datetime | 1 | Optional detection timestamp |
| `field_wnd_origin` | Geofield | 1 | Optional origin geometry |
| `field_wnd_footprint` | Geofield | 1 | Optional affected geometry |
| `field_wnd_affected_countries` | Address country-capable field | unlimited | Normalized country values |
| `field_wnd_affected_places` | Taxonomy reference -> `wnd_place` | unlimited | Named places |
| `field_wnd_external_ids` | Paragraph reference -> `wnd_external_identifier` | unlimited | External system IDs |
| `field_wnd_relationships` | Paragraph reference -> `wnd_event_relationship` | unlimited | Typed event-to-event relations |
| `field_wnd_media` | Media reference | unlimited | Curated event-level evidence / imagery |

### 4.1 Lifecycle status

`field_wnd_status` uses the following controlled values in v0.1:

- `emerging`
- `active`
- `stabilizing`
- `recovery`
- `closed`
- `historical`

These are WND editorial lifecycle states, not claims of scientific or governmental status.

### 4.2 What Event must not contain

The Event bundle must not contain mutable impact measurements as simple scalar fields such as:

- `field_fatalities`
- `field_injured`
- `field_magnitude`
- `field_depth`

Those values belong to Observations so their time, provenance, uncertainty, and supersession remain explicit.

## 5. Occurrence schema

The `wnd_occurrence` bundle represents a physical episode within an Event.

| Field | Type / representation | Cardinality | Notes |
|---|---|---:|---|
| `title` | Core node title | 1 | Editorial label |
| `field_wnd_event` | Node reference -> `wnd_event` | 1 | Required parent Event |
| `field_wnd_occurrence_type` | List text | 1 | Required common hazard-neutral occurrence class |
| `field_wnd_occurred_at` | Datetime | 1 | Required |
| `field_wnd_location` | Geofield | 1 | Optional geometry |
| `field_wnd_summary` | Long text | 1 | Optional context |
| `field_wnd_external_ids` | Paragraph reference -> `wnd_external_identifier` | unlimited | External system IDs |

Initial occurrence types:

- `main_event`
- `aftershock`
- `landfall`
- `eruption`
- `flood_peak`
- `fire_expansion`
- `other`

This is intentionally a small extensible list, not a universal hazard taxonomy.

## 6. Observation schema

The `wnd_observation` bundle is the core evidence model.

Every Observation answers:

> At a particular time, which Source asserted what about this Event or Occurrence?

| Field | Type / representation | Cardinality | Notes |
|---|---|---:|---|
| `title` | Core node title | 1 | Editorial headline / concise label |
| `field_wnd_event` | Node reference -> `wnd_event` | 1 | Required |
| `field_wnd_occurrence` | Node reference -> `wnd_occurrence` | 1 | Optional |
| `field_wnd_observation_type` | List text | 1 | Required category |
| `field_wnd_metric` | Taxonomy reference -> `wnd_metric` | 1 | Optional structured metric |
| `field_wnd_numeric_value` | Decimal | 1 | Optional numeric assertion |
| `field_wnd_text_value` | String / text | 1 | Optional textual assertion |
| `field_wnd_unit` | String | 1 | Optional explicit unit |
| `field_wnd_summary` | Long text | 1 | Narrative context |
| `field_wnd_assertion_status` | List text | 1 | Required assertion status |
| `field_wnd_observed_at` | Datetime | 1 | Required time the assertion applies |
| `field_wnd_location` | Geofield | 1 | Optional specific geometry |
| `field_wnd_places` | Taxonomy reference -> `wnd_place` | unlimited | Optional named places |
| `field_wnd_sources` | Node reference -> `wnd_source` | unlimited | Required, minimum one |
| `field_wnd_supersedes` | Node reference -> `wnd_observation` | unlimited | Prior assertions explicitly replaced/revised |
| `field_wnd_media` | Media reference | unlimited | Supporting evidence |

### 6.1 Observation types

Initial controlled values:

- `hazard`
- `impact`
- `infrastructure`
- `response`
- `humanitarian`
- `situation`
- `correction`

### 6.2 Assertion status

Initial controlled values:

- `reported`
- `confirmed`
- `estimated`
- `provisional`
- `disputed`
- `final`

The status expresses the nature of the assertion, not a generic editorial workflow state.

### 6.3 New assertion versus Drupal revision

A materially new external assertion creates a **new Observation node**.

Examples:

```text
09:00 Source A reports 23 fatalities -> Observation A
11:40 Source A reports 41 fatalities -> Observation B, supersedes A when appropriate
16:10 Source B confirms 67 fatalities -> Observation C
```

Drupal revisions of an existing Observation are reserved for editorial changes to that record, such as correcting a typo, improving its summary, or fixing metadata without claiming that a new external assertion occurred.

This preserves both source chronology and editorial history.

### 6.4 Timeline derivation

The public event timeline is not stored as a second independent timeline structure.

It is derived from the Event's Observations ordered by `field_wnd_observed_at`, optionally filtered by Observation type.

This prevents duplication between timeline entries, impact values, hazard measurements, and situation updates.

## 7. Source schema

The `wnd_source` bundle represents a reusable citable evidence item.

| Field | Type / representation | Cardinality | Notes |
|---|---|---:|---|
| `title` | Core node title | 1 | Evidence-item title |
| `field_wnd_source_type` | List text | 1 | Required source class |
| `field_wnd_source_url` | Link | 1 | Canonical evidence URL when available |
| `field_wnd_publisher` | String | 1 | Publishing agency / organization / newsroom |
| `field_wnd_published_at` | Datetime | 1 | Optional source publication timestamp |
| `field_wnd_accessed_at` | Datetime | 1 | Optional retrieval timestamp |
| `field_wnd_external_id` | String | 1 | Optional source-system identifier |
| `field_wnd_summary` | Long text | 1 | Optional editorial context |

Initial source types:

- `official_report`
- `official_statement`
- `scientific_record`
- `dataset`
- `ngo_report`
- `news_report`
- `other`

The bundle is reusable by many Observations and must not be replaced by repeated free-text citations.

## 8. Embedded Paragraph value objects

Paragraphs are used only where the value has no useful lifecycle outside its parent.

Create two Paragraph types.

### 8.1 `wnd_external_identifier`

Fields:

| Field | Type | Cardinality |
|---|---|---:|
| `field_wnd_namespace` | String | 1 |
| `field_wnd_identifier` | String | 1 |
| `field_wnd_url` | Link | 1 |

Examples:

```text
USGS -> us7000...
GDACS -> EQ...
EM-DAT -> ...
```

### 8.2 `wnd_event_relationship`

Fields:

| Field | Type | Cardinality |
|---|---|---:|
| `field_wnd_relationship_type` | List text | 1 |
| `field_wnd_target_event` | Node reference -> `wnd_event` | 1 |

Initial relationship values:

- `triggered`
- `triggered_by`
- `related`
- `parent`
- `child`

The recipe does not implement automatic inverse relationship maintenance in v0.1. That would require executable behavior and belongs in a future custom module if proven necessary.

## 9. Geography strategy

Geography is first-class structured data.

Use Geofield for geometry storage and Leaflet for Drupal map widgets.

The schema must support:

- point origins / epicenters
- lines where needed later
- polygons / multipolygons for affected footprints
- occurrence-specific locations
- observation-specific locations
- representative geometry for `wnd_place` terms

The public map remains an Astro concern. Drupal's map integration exists for authoring and structured storage, not as the production rendering layer.

PostGIS is explicitly out of scope for v0.1. The content volume and query requirements do not yet justify a database-level geospatial dependency.

## 10. Admin experience

The recipe must produce a Drupal admin experience that is usable for disaster editorial work rather than a flat field dump.

Use `field_group` to organize the Event edit form into meaningful sections.

Event groups:

1. **Event**
   - title
   - short title
   - summary
   - lifecycle status
2. **Classification**
   - primary hazard
   - secondary hazards
3. **When**
   - start
   - end
   - detected
4. **Where**
   - countries
   - places
   - origin geometry
   - affected footprint
5. **Relationships**
   - related / triggered events
6. **External records**
   - external identifiers
7. **Media**
   - curated media

Create dedicated administrative Views for:

- Disaster Events
- Occurrences
- Observations
- Sources

The Observations administration view must expose filters for:

- Event
- Observation type
- metric
- assertion status
- observed date
- Source

These Views are for Drupal editorial management. Astro continues to consume direct JSON:API entity resources for ordinary page composition, consistent with Drupal_Astro_Kit's existing architecture.

## 11. Recipe composition

The new recipe lives at:

```text
setup/drupal-recipes/wnd_disaster_event/
```

Minimum package structure:

```text
wnd_disaster_event/
  composer.json
  recipe.yml
  config/
```

The package is exposed through `setup/recipe-manifest.json` as an optional Drupal_Astro_Kit capability.

The Recipe composes:

- `dak-decoupled-base`
- `dak-media-images`

It does **not** compose `dak-structured-content`, because that recipe intentionally creates the unrelated `headless_page` model.

`wnd_disaster_event` directly requires and installs its own structural/admin dependencies:

- Geofield
- Leaflet
- Address
- Field Group
- Paragraphs
- Entity Reference Revisions

This keeps WND independent from the generic `headless_page` content model while still following DAK's established Recipe packaging conventions.

## 12. Contrib dependency policy

The v0.1 design permits exactly the following new contrib capabilities because each has a clear domain or admin-UX role:

- Geofield
- Leaflet
- Address
- Field Group
- Paragraphs
- Entity Reference Revisions

Existing DAK JSON:API / Pathauto / Media capabilities are reused through recipe composition.

Do not add the following in v0.1:

- Gin admin theme
- Search API
- PostGIS-specific modules
- ECA
- Diff
- Entity Browser
- Auto Entity Label
- workflow / moderation contrib beyond Drupal core needs
- custom WND PHP module

These may be reconsidered only when a concrete requirement demonstrates their value.

## 13. Naming rules

All WND-specific Drupal field machine names use the prefix:

```text
field_wnd_
```

All WND-specific content type, vocabulary, Paragraph, View, and recipe machine names use a `wnd_` prefix.

This is required to reduce recipe collisions and make configuration provenance obvious.

## 14. JSON:API contract principles

Drupal is the source of truth. Astro must not recreate a second independent domain schema in Markdown or TypeScript content collections.

The Recipe exposes the entities through Drupal JSON:API using DAK's existing decoupled base.

The initial public Event page must be composable from:

- one `wnd_event` resource
- related `wnd_occurrence` resources
- related `wnd_observation` resources
- referenced `wnd_source` resources
- referenced taxonomy terms and Media resources

No custom JSON:API normalization is part of v0.1. If standard JSON:API plus existing DAK tooling proves insufficient during implementation, that discovery is a BLOCKER requiring an explicit design amendment rather than silent scope expansion.

## 15. Revision and provenance rules

Revision history is fundamental to this domain.

Requirements:

- Event, Occurrence, Observation, and Source use Drupal node revisions.
- A materially new externally asserted value always creates a new Observation.
- A changed casualty count is never implemented by overwriting an Event scalar field.
- When a new Observation explicitly replaces an earlier assertion, `field_wnd_supersedes` records that relationship.
- Drupal revisions of an Observation preserve editorial changes to that Observation; they do not substitute for new source assertions.
- Historical source assertions remain reconstructable as distinct Observation nodes.
- The current public value for a metric may later be derived by selecting applicable non-superseded Observations according to application rules, but that computation is not implemented in the Recipe itself.

## 16. Fixture strategy

The production Recipe defines schema and authoring configuration only.

It does not embed the Colombia disaster as canonical starter content and does not seed a large hazard or metric corpus.

Validation uses a separate fixture representing one real earthquake Event end-to-end. During v0.1 implementation this fixture may be created by a validation script or test procedure, but it is not shipped as production Recipe content.

The fixture must demonstrate that the schema can represent:

- event identity
- event lifecycle
- main shock
- aftershocks
- magnitude and depth Observations
- evolving casualty Observations
- affected geography
- affected named places
- infrastructure / response Observations
- multiple Sources
- superseded Observations
- external IDs

A separate `wnd_disaster_event_demo` Recipe is explicitly PARKED until the core Recipe installs and validates cleanly.

## 17. Public IA consequences

This Recipe does not build the full WorldNaturalDisasters frontend, but the schema is intentionally compatible with a shallow event-centric IA:

```text
/
/events
/events/{slug}
/map
/places/{place}
/disasters/{hazard-type}
/about/data-sources
```

Derived indexes are queries over structured Event data, not independent hand-authored content silos.

## 18. Explicit non-goals for v0.1

The following are outside this milestone:

- live external API ingestion
- automated USGS / GDACS reconciliation
- duplicate-event detection
- AI-generated risk assessments
- public user-generated content
- public commenting
- moderation workflows for community submissions
- alerts / notifications
- CAP ingestion
- automated source-confidence scoring
- automated inverse event relationships
- custom PHP domain entities
- PostGIS
- a production public map
- an Astro implementation of every IA route
- a comprehensive global hazard taxonomy
- production demo content
- the `wnd_disaster_event_demo` Recipe

Discovery of any of these during implementation must be classified as BLOCKER, PARK, or KILL rather than silently expanding scope.

## 19. Success criteria

The design is successfully implemented when all of the following are true:

1. Drupal_Astro_Kit can optionally install `wnd_disaster_event` through its existing Recipe setup flow.
2. The Recipe installs cleanly on a fresh generated Drupal 11 backend.
3. Drupal contains the four required node bundles using normal Drupal revisions.
4. Drupal contains the three required vocabularies and two Paragraph types.
5. The Event form is organized into coherent editorial sections.
6. Editors can create and edit geospatial fields through a usable Leaflet-backed map widget.
7. An Observation requires an Event and at least one Source.
8. Observations can represent both numeric metrics and narrative situation updates.
9. A new external assertion can supersede an earlier Observation without deleting or rewriting that historical assertion.
10. Occurrences can be associated with an Event and separately observed / measured.
11. The resulting entities are available through JSON:API.
12. Existing DAK static-first behavior remains intact.
13. Existing optional DAK Recipes continue to function.
14. No sample disaster facts are embedded into the production Recipe.
15. The schema can represent the Colombia-earthquake validation fixture without stuffing essential facts into generic unstructured text.

## 20. Architectural invariants

These rules survive future extensions unless intentionally superseded by a new design decision:

- **The Disaster Event is the atomic public unit.**
- **The Observation is the atomic evidence unit.**
- **A Source is a citable evidence item, not merely a publisher name.**
- **New external assertions create new Observations.**
- **Mutable facts carry provenance rather than living as timeless Event fields.**
- **Occurrences model physical episodes, not editorial updates.**
- **Sources are reusable first-class records.**
- **Paragraphs are embedded value objects, not the primary disaster database.**
- **Drupal owns content; Astro owns presentation.**
- **The public deployment remains static-first.**
- **Schema growth follows demonstrated disaster-domain requirements, not speculative feature breadth.**
- **The milestone owns the work. The work does not redefine the milestone.**
