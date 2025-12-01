/**
 * Drupal JSON:API Client
 * 
 * Fetches content from Drupal's JSON:API with pagination support.
 * Used at BUILD TIME to generate static pages.
 * 
 * Dependencies:
 * - jsona: Deserializes JSON:API responses
 * - drupal-jsonapi-params: Builds query strings
 */

import Jsona from 'jsona';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';

const dataFormatter = new Jsona();

// Type definitions for Drupal Page nodes
export interface DrupalPage {
  id: string;
  type: string;
  title: string;
  path?: {
    alias: string;
    pid: number;
    langcode: string;
  };
  body?: {
    value: string;
    format: string;
    processed: string;
    summary: string;
  };
  status: boolean;
  created: string;
  changed: string;
}

/**
 * Get the API base URL from environment
 */
function getApiBase(): string {
  // import.meta.env is Astro's way of accessing environment variables
  const envUrl = import.meta.env.API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, ''); // Remove trailing slash
  
  // Fallback to common DDEV URL pattern
  return 'http://localhost';
}

/**
 * Check if the Drupal JSON:API is accessible
 */
export async function checkApiConnection(): Promise<void> {
  const apiBase = getApiBase();
  const response = await fetch(`${apiBase}/jsonapi`, {
    method: 'HEAD',
  });
  
  if (!response.ok) {
    throw new Error(`JSON:API returned ${response.status}: ${response.statusText}`);
  }
}

/**
 * Fetch all published pages from Drupal JSON:API with pagination support
 */
export async function getAllPages(): Promise<DrupalPage[]> {
  const apiBase = getApiBase();
  const allPages: DrupalPage[] = [];
  
  // Build query params
  const params = new DrupalJsonApiParams();
  params
    .addFilter('status', '1') // Published only
    .addFields('node--page', ['title', 'body', 'path', 'status', 'created', 'changed'])
    .addPageLimit(50); // Fetch 50 per page
  
  let nextUrl: string | null = `${apiBase}/jsonapi/node/page?${params.getQueryString()}`;
  
  while (nextUrl) {
    const response = await fetch(nextUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch pages: ${response.status} ${response.statusText}`);
    }
    
    const json = await response.json();
    
    // Deserialize JSON:API response using jsona
    const pages = dataFormatter.deserialize(json) as DrupalPage | DrupalPage[];
    
    if (Array.isArray(pages)) {
      allPages.push(...pages);
    } else if (pages) {
      allPages.push(pages);
    }
    
    // Check for next page (pagination)
    nextUrl = json.links?.next?.href || null;
  }
  
  return allPages;
}

/**
 * Convert a Drupal path alias to an Astro route slug
 * 
 * Examples:
 *   "/" → undefined (homepage)
 *   "/about" → "about"
 *   "/company/team" → "company/team"
 * 
 * Returns undefined for the homepage so Astro generates index.html
 */
export function aliasToSlug(alias: string): string | undefined {
  // Homepage case
  if (!alias || alias === '/') {
    return undefined;
  }
  
  // Remove leading slash for Astro routing
  return alias.replace(/^\//, '');
}
