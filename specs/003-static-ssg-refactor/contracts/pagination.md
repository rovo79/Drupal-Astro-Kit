# JSON:API Pagination Behavior

**Version**: 1.0  
**Date**: 2025-01-26  
**Feature**: 003-static-ssg-refactor

## Overview

Drupal's JSON:API module implements cursor-based pagination with configurable page sizes. The `drupal.ts` client automatically follows pagination links to fetch all content at build time.

## Default Behavior

- **Default page limit**: 50 items per request
- **Maximum page limit**: 50 items (Drupal JSON:API hard limit)
- **Pagination links**: `links.next.href` and `links.prev.href` in response

## Pagination with 100+ Pages

When fetching more than 50 pages:

### Request 1

```http
GET /jsonapi/node/page?filter[status]=1&page[limit]=50&sort=title
```

Response includes:

```json
{
  "data": [/* 50 pages */],
  "links": {
    "self": { "href": "..." },
    "next": { "href": "/jsonapi/node/page?filter[status]=1&page[limit]=50&page[offset]=50&sort=title" }
  },
  "meta": { "count": 100 }
}
```

### Request 2

```http
GET /jsonapi/node/page?filter[status]=1&page[limit]=50&page[offset]=50&sort=title
```

Response:

```json
{
  "data": [/* remaining 50 pages */],
  "links": {
    "self": { "href": "..." },
    "prev": { "href": "/jsonapi/node/page?filter[status]=1&page[limit]=50&sort=title" }
  },
  "meta": { "count": 100 }
}
```

No `next` link indicates end of results.

## Client Implementation

The `drupal.ts` client handles pagination automatically:

```typescript
// From astro-frontend/src/lib/drupal.ts
export async function getAllPages(): Promise<DrupalPage[]> {
  const allPages: DrupalPage[] = [];
  let nextUrl: string | null = initialUrl;

  while (nextUrl) {
    const { data, links } = await fetchJsonApi<DrupalPage[]>(nextUrl);
    allPages.push(...data);
    nextUrl = links?.next?.href ?? null;
  }

  return allPages;
}
```

## Performance Considerations

| Page Count | Requests | Approximate Time |
|------------|----------|------------------|
| 1-50       | 1        | ~100ms           |
| 51-100     | 2        | ~200ms           |
| 101-150    | 3        | ~300ms           |

For sites with 100 pages (target maximum), expect 2 API requests during build.

## Edge Cases

### Empty Site

When no published pages exist:

```json
{
  "data": [],
  "links": { "self": { "href": "..." } },
  "meta": { "count": 0 }
}
```

The client returns an empty array, and `getStaticPaths()` generates only built-in Astro routes.

### All Unpublished

When all pages are unpublished (status=0):

```json
{
  "data": [],
  "links": { "self": { "href": "..." } },
  "meta": { "count": 0 }
}
```

Same as empty site - filter excludes unpublished content.

## Testing Pagination

### Manual Test with curl

```bash
# First page
curl -s "http://$(basename $PWD).ddev.site/jsonapi/node/page?page[limit]=2" \
  -H "Accept: application/vnd.api+json" | jq '.links.next.href'

# Follow next link
curl -s "<next-href-from-above>" \
  -H "Accept: application/vnd.api+json" | jq '.data | length'
```

### Build-Time Logging

The client logs pagination progress:

```
[drupal] Fetching pages from JSON:API...
[drupal] Page 1: 50 items
[drupal] Page 2: 23 items
[drupal] Total: 73 pages fetched
```
