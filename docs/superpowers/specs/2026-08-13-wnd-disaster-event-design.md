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

The Event is the only v0.1 domain object that is expected to have a public standalone Astro route.

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
- magnitude revised to Mw 7.4
- airport operations suspended
- 15 km depth reported by a seismic agency
- evacuation ordered for a named zone

Observations are intentionally broader than numeric measurements. They are the unified provenance-bearing unit for both structured metrics and meaningful situation updates.

### 2.4 Source

A reusable provenance record representing an authority, scientific agency, NGO, newsroom, dataset, report, or other information origin.

Sources are reusable across many observations and events.

## 3. Drupal representations

### 3.1 First-class node bundles

Create four node types:

- `wnd_event`
- `wnd_occurrence`
- `wnd_observation`
- `wnd_source`

All four must be revisionable through Drupal's normal node revision system.

Only `wnd_event` is treated as publicly routable by the initial Astro implementation. The other bundles exist for editorial management, API traversal, provenance, filtering, and future uses.

### 3.2 Taxonomy vocabularies

Create three core vocabularies:

- `wnd_hazard_type`
- `wnd_metric`
- `wnd_place`

#### `wnd_hazard_type`

Hierarchical hazard classification.

Initial design supports parent/child classification such as:

```text
Geophysical
  -> Earthquake

Hydrological
  -> Flood
      -> Flash flood

Meteorological
  -> Tropical cyclone
```

The recipe may seed a minimal useful vocabulary, but it must not attempt to encode a comprehensive global hazard ontology in v0.1.

#### `wnd_metric`

Canonical measurable concepts referenced by observations.

Examples:

- fatalities
- injured
- missing
- displaced
- affected population
- magnitude
- depth
- buildings damaged
- buildings destroyed

Metric terms may carry machine-readable metadata such as a stable code, category, and default unit.

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

Countries are not modeled as `wnd_place` taxonomy terms solely to recreate a country list.

## 4. Event schema

The `wnd_event` bundle contains durable event identity, lifecycle, classification, geography, relationships, and selected media.

Required design fields:

| Field | Type / representation | Cardinality | Notes |
|---|---|---:|---|
| `title` | Core node title | 1 | Canonical event title |
| `field_wnd_short_title` | String | 1 | Optional compact display title |
| `field_wnd_summary` | Long text | 1 | Authoritative orientation summary |
| `field_wnd_status` | List text | 1 | Editorial lifecycle state |
| `field_wnd_hazard_type` | Taxonomy reference -> `wnd_hazard_type` | 1 | Primary hazard |
| `field_wnd_secondary_hazards` | Taxonomy reference -> `wnd_hazard_type` | unlimited | Cascading / secondary hazards |
| `field_wnd_start_at` | Datetime | 1 | Required event start |
| `field_wnd_end_at` | Datetime | 1 | Optional event end |
| `field_wnd_detected_at` | Datetime | 1 | Optional detection timestamp |
| `field_wnd_origin` | Geofield | 1 | Optional point or appropriate origin geometry |
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

Those values belong to Observations so their time, provenance, revision, uncertainty, and supersession remain explicit.

## 5. Occurrence schema

The `wnd_occurrence` bundle represents a physical episode within an Event.

| Field | Type / representation | Cardinality | Notes |
|---|---|---:|---|
| `title` | Core node title | 1 | Editorial label |
| `field_wnd_event` | Node reference -> `wnd_event` | 1 | Required parent Event |
| `field_wnd_occurrence_type` | List text | 1 | Common hazard-neutral occurrence class |
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

> At a particular time, which source asserted what about this Event or Occurrence?

| Field | Type / representation | Cardinality | Notes |
|---|---|---:|---|
| `title` | Core node title | 1 | Editorial headline / concise label |
| `field_wnd_event` | Node reference -> `wnd_event` | 1 | Required |
| `field_wnd_occurrence` | Node reference -> `wnd_occurrence` | 1 | Optional |
| `field_wnd_observation_type` | List text | 1 | Required category |
| `field_wnd_metric` | Taxonomy reference -> `wnd_metric` | 1 | Optional structured metric |
| `field_wnd_numeric_value` | Decimal | 1 | Optional numeric assertion |
| `field_wnd_text_value` | String / text | 1 | Optional text assertion |
| `field_wnd_unit` | String | 1 | Optional explicit unit when needed |
| `field_wnd_summary` | Long text | 1 | Narrative context |
| `field_wnd_assertion_status` | List text | 1 | Required provenance status |
| `field_wnd_observed_at` | Datetime | 1 | Required time the assertion applies |
| `field_wnd_location` | Geofield | 1 | Optional specific geometry |
| `field_wnd_places` | Taxonomy reference -> `wnd_place` | unlimited | Optional named places |
| `field_wnd_sources` | Node reference -> `wnd_source` | unlimited | Required, minimum one |
| `field_wnd_supersedes` | Node reference -> `wnd_observation` | unlimited | Prior observations replaced or revised |
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

### 6.3 Timeline derivation

The public event timeline is not stored as a second independent timeline structure.

It is derived from the Event's Observations ordered by `field_wnd_observed_at`, optionally filtered by observation type.

This prevents duplication between timeline entries, impact values, hazard measurements, and situation updates.

## 7. Source schema

The `wnd_source` bundle represents reusable provenance.

Required design fields:

| Field | Type / representation | Cardinality | Notes |
|---|---|---:|---|
| `title` | Core node title | 1 | Source name |
| `field_wnd_source_type` | List text | 1 | Authority / scientific / NGO / news / dataset / other |
| `field_wnd_source_url` | Link | 1 | Canonical source URL |
| `field_wnd_publisher` | String | 1 | Optional publisher / agency |
| `field_wnd_external_id` | String | 1 | Optional source-system ID |
| `field_wnd_summary` | Long text | 1 | Optional editorial context |

The source bundle must be reusable by many observations and must not be embedded as repeated free-text citations.

## 8. Embedded Paragraph value objects

Paragraphs are used only where the value has no useful lifecycle outside its parent.

Create two Paragraph types.

### 8.1 `wnd_external_identifier`

Fields:

- `field_wnd_namespace`
- `field_wnd_identifier`
- `field_wnd_url`

Examples:

```text
USGS -> us7000...
GDACS -> EQ...
EM-DAT -> ...
```

### 8.2 `wnd_event_relationship`

Fields:

- `field_wnd_relationship_type`
- `field_wnd_target_event`

Initial relationship values:

- `triggered`
- `triggered_by`
- `related`
- `parent`
- `child`

The recipe does not implement automatic inverse relationship maintenance in v0.1. That would require executable behavior and belongs in a future custom module if proven necessary.

## 9. Geography strategy

Geography is first-class structured data.

Use Geofield for geometry storage and Leaflet for Drupal map widgets where practical.

The schema must support:

- point origins / epicenters
- lines where needed later
- polygons / multipolygons for affected footprints
- occurrence-specific locations
- observation-specific locations

The public map remains an Astro concern. Drupal's map integration exists for authoring and structured storage, not as the production rendering layer.

PostGIS is explicitly out of scope for v0.1. The content volume and query requirements do not yet justify a database-level geospatial dependency.

## 10. Admin experience

The recipe must produce a Drupal admin experience that is usable for disaster editorial work rather than a flat field dump.

Use `field_group` to organize the Event edit form into meaningful sections.

Recommended Event groups:

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

The Observations administration view should expose filtering by at least:

- Event
- observation type
- metric
- assertion status
- observed date
- source

These Views are for Drupal editorial management. Astro should continue to consume direct JSON:API entity resources for ordinary page composition, consistent with Drupal_Astro_Kit's existing architecture.

## 11. Recipe composition

The new recipe should live at:

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

The recipe composes existing DAK capabilities rather than duplicating them.

Expected composition:

- `dak_decoupled_base`
- `dak_media_images`

Paragraphs and Entity Reference Revisions may be installed directly by this recipe unless composition with `dak_structured_content` is proven cleaner during implementation. The disaster recipe must not create or depend on the unrelated `headless_page` content model merely to gain Paragraphs support.

## 12. Contrib dependency policy

The v0.1 design permits the following contrib modules because each has a clear domain or admin-UX role:

- Geofield
- Leaflet
- Address
- Field Group
- Paragraphs
- Entity Reference Revisions

Existing DAK JSON:API / Pathauto / Media dependencies are reused through recipe composition.

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

The recipe must expose the entities through Drupal JSON:API using DAK's existing decoupled base.

The initial public Event page should be composable from:

- one `wnd_event` resource
- related `wnd_occurrence` resources
- related `wnd_observation` resources
- referenced `wnd_source` resources
- referenced taxonomy terms and Media resources

No custom JSON:API normalization is part of v0.1 unless implementation proves that standard JSON:API plus existing DAK tooling cannot represent the model cleanly.

## 15. Revision and provenance rules

Revision history is fundamental to this domain.

Requirements:

- Event, Occurrence, Observation, and Source are revisionable nodes.
- A changed casualty count is represented by a new or revised Observation, not an overwrite of an Event scalar field.
- When a new Observation explicitly replaces an earlier assertion, `field_wnd_supersedes` records that relationship.
- Historical source assertions should remain reconstructable.
- The current public value for a metric may later be derived by selecting the newest applicable non-superseded Observation according to application rules, but that computation is not implemented in the Recipe itself.

## 16. Fixture strategy

The production recipe defines schema and authoring configuration only.

It does not embed the Colombia disaster as canonical starter content.

Validation must use a separate fixture or later demo recipe representing one real earthquake event end-to-end.

The fixture must demonstrate that the schema can represent:

- event identity
- event lifecycle
- main shock
- aftershocks
- magnitude and depth observations
- evolving casualty observations
- affected geography
- affected named places
- infrastructure / response observations
- multiple sources
- superseded observations
- external IDs

A separate `wnd_disaster_event_demo` recipe is explicitly parked until the core recipe installs and validates cleanly.

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

Derived indexes should be queries over structured Event data, not independent hand-authored content silos.

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
- the demo-content recipe

Discovery of any of these during implementation must be classified as BLOCKER, PARK, or KILL rather than silently expanding scope.

## 19. Success criteria

The design is successfully implemented when all of the following are true:

1. Drupal_Astro_Kit can optionally install `wnd_disaster_event` through its existing Recipe setup flow.
2. The Recipe installs cleanly on a fresh generated Drupal 11 backend.
3. Drupal contains the four required revisionable node bundles.
4. Drupal contains the three required vocabularies and two Paragraph types.
5. The Event form is organized into coherent editorial sections.
6. Editors can create and edit geospatial fields through a usable map widget.
7. An Observation must reference an Event and at least one Source.
8. Observations can represent both numeric metrics and narrative situation updates.
9. An Observation can supersede an earlier Observation without deleting historical evidence.
10. Occurrences can be associated with an Event and separately observed / measured.
11. The resulting entities are available through JSON:API.
12. Existing DAK static-first behavior remains intact.
13. Existing optional DAK recipes continue to function.
14. No sample disaster facts are embedded into the production Recipe.
15. The schema can represent the Colombia-earthquake validation fixture without stuffing essential facts into generic unstructured text.

## 20. Architectural invariants

These rules should survive future extensions unless intentionally superseded by a new design decision:

- **The Disaster Event is the atomic public unit.**
- **The Observation is the atomic evidence unit.**
- **Mutable facts carry provenance rather than living as timeless Event fields.**
- **Occurrences model physical episodes, not editorial updates.**
- **Sources are reusable first-class records.**
- **Paragraphs are embedded value objects, not the primary disaster database.**
- **Drupal owns content; Astro owns presentation.**
- **The public deployment remains static-first.**
- **Schema growth follows demonstrated disaster-domain requirements, not speculative feature breadth.**
- **The milestone owns the work. The work does not redefine the milestone.**
