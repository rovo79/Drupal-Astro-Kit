# JSON:API Page Node Contract

**Version**: 1.0  
**Date**: 2025-01-26  
**Feature**: 003-static-ssg-refactor

## Endpoint

```
GET {DRUPAL_API_URL}/node/page
```

Where `DRUPAL_API_URL` is typically `http://{project-name}.ddev.site/jsonapi` for local development.

## Authentication

- **Anonymous access**: Required
- **Permission**: `access content` granted to anonymous users by setup script

## Request Headers

```http
Accept: application/vnd.api+json
```

## Query Parameters

### Filtering

```
filter[status]=1                     # Published pages only
filter[path.alias]=/about            # Filter by specific alias
```

### Sparse Fieldsets

```
fields[node--page]=title,body,path,status,created,changed
```

### Sorting

```
sort=title                           # Alphabetical by title
sort=-changed                        # Most recently updated first
```

### Pagination

```
page[limit]=50                       # Maximum items per page (default: 50)
page[offset]=0                       # Starting offset
```

## Response Structure

### Success Response (200 OK)

```json
{
  "jsonapi": {
    "version": "1.1",
    "meta": {
      "links": {
        "self": {
          "href": "http://jsonapi.org/format/1.1/"
        }
      }
    }
  },
  "data": [
    {
      "type": "node--page",
      "id": "uuid-here",
      "links": {
        "self": {
          "href": "http://project.ddev.site/jsonapi/node/page/uuid-here"
        }
      },
      "attributes": {
        "drupal_internal__nid": 1,
        "drupal_internal__vid": 1,
        "langcode": "en",
        "status": true,
        "title": "About Us",
        "created": "2025-01-26T10:00:00+00:00",
        "changed": "2025-01-26T10:00:00+00:00",
        "path": {
          "alias": "/about",
          "pid": 1,
          "langcode": "en"
        },
        "body": {
          "value": "<p>Raw HTML content</p>",
          "format": "basic_html",
          "processed": "<p>Processed HTML content</p>",
          "summary": ""
        }
      }
    }
  ],
  "links": {
    "self": {
      "href": "http://project.ddev.site/jsonapi/node/page"
    },
    "next": {
      "href": "http://project.ddev.site/jsonapi/node/page?page[offset]=50"
    }
  },
  "meta": {
    "count": 100
  }
}
```

### Key Fields

| Field | Type | Description | Required for SSG |
|-------|------|-------------|------------------|
| `id` | string (UUID) | Unique identifier | ✅ Yes |
| `attributes.title` | string | Page title | ✅ Yes |
| `attributes.path.alias` | string | URL path alias (e.g., "/about") | ✅ Yes |
| `attributes.body.processed` | string | Sanitized HTML content | ✅ Yes |
| `attributes.status` | boolean | Published status | ✅ Yes (filter) |
| `attributes.changed` | string (ISO 8601) | Last modified timestamp | Optional |

### Pagination Links

When there are more results than `page[limit]`, the response includes:

- `links.next.href`: URL for the next page of results
- `links.prev.href`: URL for the previous page (if not first page)

The `drupal.ts` client follows these links automatically until all pages are fetched.

## Homepage Handling

The homepage has a special path alias of `/`:

```json
{
  "attributes": {
    "title": "Welcome to Project Name",
    "path": {
      "alias": "/"
    }
  }
}
```

In Astro's `getStaticPaths()`, this maps to an undefined slug (root index).

## Error Responses

### 401 Unauthorized

Anonymous access not enabled:

```json
{
  "errors": [{
    "status": "401",
    "title": "Unauthorized",
    "detail": "No authentication credentials provided."
  }]
}
```

**Fix**: Grant 'access content' permission to anonymous role.

### 403 Forbidden

JSON:API read access restricted:

```json
{
  "errors": [{
    "status": "403",
    "title": "Forbidden",
    "detail": "The current user is not allowed to GET the selected resource."
  }]
}
```

**Fix**: Enable JSON:API read access for anonymous users.

### CORS Errors

If the browser blocks the request:

```
Access to fetch at 'http://project.ddev.site/jsonapi/node/page' 
from origin 'http://localhost:4321' has been blocked by CORS policy
```

**Fix**: Verify CORS configuration in `services.yml` includes `http://localhost:4321` in `allowedOrigins`.

## Testing

### Manual Verification

```bash
# From project root with DDEV running
curl -s "http://$(basename $PWD).ddev.site/jsonapi/node/page" \
  -H "Accept: application/vnd.api+json" | jq '.data[].attributes.path.alias'
```

Expected output:
```json
"/"
"/about"
"/contact"
```

### Build-Time Verification

The `drupal.ts` client includes `checkApiConnection()` for build-time validation:

```typescript
import { checkApiConnection, getAllPages } from './lib/drupal';

// In getStaticPaths()
await checkApiConnection(); // Throws if unreachable
const pages = await getAllPages();
```
