/**
 * Drupal JSON:API Client for Static Site Generation
 * 
 * Provides pagination-aware fetching of Drupal content at build time.
 * Uses jsona for JSON:API deserialization and drupal-jsonapi-params for query building.
 * 
 * @module lib/drupal
 */

import { Jsona } from 'jsona';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';

// Types for JSON:API responses
interface JsonApiLinks {
  self?: { href: string };
  next?: { href: string };
  prev?: { href: string };
}

interface JsonApiResponse {
  data: unknown;
  links?: JsonApiLinks;
  meta?: {
    count?: number;
  };
}

// Drupal Page entity shape after deserialization
export interface DrupalPage {
  id: string;
  type: string;
  title: string;
  body?: {
    value?: string;
    processed?: string;
    summary?: string;
  };
  path?: {
    alias?: string;
    pid?: number;
    langcode?: string;
  };
  status?: boolean;
  created?: string;
  changed?: string;
}

// Get API URL from environment
function getApiUrl(): string {
  const apiUrl = import.meta.env.DRUPAL_API_URL;
  if (!apiUrl) {
    throw new Error(
      'DRUPAL_API_URL is not configured. Set it in .env file (e.g., http://your-project.ddev.site/jsonapi)'
    );
  }
  return apiUrl;
}

// Shared Jsona instance for deserialization
const dataFormatter = new Jsona();

/**
 * Fetch a single JSON:API endpoint with proper error handling
 */
async function fetchJsonApi<T = unknown>(url: string): Promise<{ data: T; links?: JsonApiLinks }> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`JSON:API request failed: ${response.status} ${response.statusText} for ${url}`);
  }

  const json: JsonApiResponse = await response.json();
  const deserialized = dataFormatter.deserialize(json) as T;

  return {
    data: deserialized,
    links: json.links,
  };
}

/**
 * Fetch all pages with automatic pagination
 * 
 * Fetches all published pages from Drupal's JSON:API, following pagination links
 * until all pages are retrieved. Used by getStaticPaths() at build time.
 * 
 * @param options - Optional filtering and sorting options
 * @returns Array of all Drupal pages
 */
export async function getAllPages(options: {
  filter?: Record<string, string>;
  sort?: string;
  pageLimit?: number;
} = {}): Promise<DrupalPage[]> {
  const apiUrl = getApiUrl();
  const allPages: DrupalPage[] = [];

  // Build initial query params
  const params = new DrupalJsonApiParams();
  
  // Default: only published content
  params.addFilter('status', '1');
  
  // Add custom filters
  if (options.filter) {
    Object.entries(options.filter).forEach(([key, value]) => {
      params.addFilter(key, value);
    });
  }

  // Include path field for alias routing
  params.addFields('node--page', ['title', 'body', 'path', 'status', 'created', 'changed']);

  // Default: sort by title
  if (options.sort) {
    params.addSort(options.sort);
  } else {
    params.addSort('title');
  }

  // Pagination limit (JSON:API default max is 50)
  const pageLimit = options.pageLimit ?? 50;
  params.addPageLimit(pageLimit);

  let nextUrl: string | null = `${apiUrl}/node/page?${params.getQueryString()}`;

  // Follow pagination links until exhausted
  while (nextUrl) {
    try {
      const { data, links } = await fetchJsonApi<DrupalPage | DrupalPage[]>(nextUrl);

      // Handle both single item and collection responses
      if (Array.isArray(data)) {
        allPages.push(...data);
      } else if (data) {
        allPages.push(data);
      }

      // Check for next page
      nextUrl = links?.next?.href ?? null;
    } catch (error) {
      console.error('Error fetching pages:', error);
      throw error;
    }
  }

  return allPages;
}

/**
 * Fetch a single page by its path alias
 * 
 * @param alias - The URL path alias (e.g., '/about' or 'about')
 * @returns The page data or null if not found
 */
export async function getPageByAlias(alias: string): Promise<DrupalPage | null> {
  const apiUrl = getApiUrl();

  // Normalize alias (ensure leading slash)
  const normalizedAlias = alias.startsWith('/') ? alias : `/${alias}`;

  // Build query for path alias filter
  const params = new DrupalJsonApiParams();
  params.addFilter('status', '1');
  params.addFilter('path.alias', normalizedAlias);
  params.addFields('node--page', ['title', 'body', 'path', 'status', 'created', 'changed']);

  const url = `${apiUrl}/node/page?${params.getQueryString()}`;

  try {
    const { data } = await fetchJsonApi<DrupalPage[]>(url);

    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }

    return null;
  } catch (error) {
    console.error(`Error fetching page by alias "${normalizedAlias}":`, error);
    throw error;
  }
}

/**
 * Check if Drupal JSON:API is reachable
 * 
 * Useful for build-time validation before fetching all pages.
 * 
 * @returns true if API is reachable, throws otherwise
 */
export async function checkApiConnection(): Promise<boolean> {
  const apiUrl = getApiUrl();

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }
    return true;
  } catch (error) {
    throw new Error(
      `Cannot connect to Drupal JSON:API at ${apiUrl}. ` +
      `Is DDEV running? (cd drupal-backend && ddev start)\n` +
      `Original error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Convert a Drupal path alias to an Astro route param
 * 
 * Handles edge cases:
 * - Homepage (/) becomes undefined (root index)
 * - Nested paths (/foo/bar) become 'foo/bar'
 * - Leading slashes are removed
 * 
 * @param alias - The Drupal path alias
 * @returns The slug for getStaticPaths params, or undefined for homepage
 */
export function aliasToSlug(alias: string | undefined): string | undefined {
  if (!alias || alias === '/') {
    return undefined; // Homepage
  }

  // Remove leading slash and return
  return alias.replace(/^\//, '');
}
