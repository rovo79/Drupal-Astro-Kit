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

import {Jsona} from 'jsona';
import {DrupalJsonApiParams} from 'drupal-jsonapi-params';

const dataFormatter: Jsona = new Jsona();
const DEFAULT_HOMEPAGE_ALIAS = '/home';
const PAGE_QUERY_FIELDS = ['title', 'body', 'path', 'status', 'created', 'changed'];

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
function getDrupalBaseUrl(): string {
  const envDrupalBase = import.meta.env.DRUPAL_BASE_URL;
  if (envDrupalBase) return envDrupalBase.replace(/\/$/, '');

  // Back-compat: older templates used API_BASE_URL.
  const envApiBase = import.meta.env.API_BASE_URL;
  if (envApiBase) return envApiBase.replace(/\/$/, '');

  return 'http://localhost';
}

function getDrupalJsonApiBaseUrl(): string {
  const envJsonApi = import.meta.env.DRUPAL_JSONAPI_URL || import.meta.env.DRUPAL_API_URL;
  if (envJsonApi) return envJsonApi.replace(/\/$/, '');

  return `${getDrupalBaseUrl()}/jsonapi`;
}

function buildPageQueryParams(limit: number): DrupalJsonApiParams {
  const params = new DrupalJsonApiParams();
  params
    .addFilter('status', '1')
    .addFields('node--page', PAGE_QUERY_FIELDS)
    .addPageLimit(limit);

  return params;
}

function getPageCollectionUrl(limit: number): string {
  const jsonApiBase = getDrupalJsonApiBaseUrl();
  const params = buildPageQueryParams(limit);
  return `${jsonApiBase}/node/page?${params.getQueryString()}`;
}

/**
 * Check if the Drupal JSON:API is accessible
 */
export async function checkApiConnection(): Promise<void> {
  const endpoint = getPageCollectionUrl(1);
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`JSON:API page collection ${endpoint} returned ${response.status}: ${response.statusText}`);
  }
}

/**
 * Fetch all published pages from Drupal JSON:API with pagination support
 */
export async function getAllPages(): Promise<DrupalPage[]> {
  const allPages: DrupalPage[] = [];
  let nextUrl: string | null = getPageCollectionUrl(50);
  
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

function normalizeAliasOrEmpty(alias?: string | null): string {
  if (!alias) {
    return '';
  }

  let normalized = alias.trim();
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.replace(/\/+$/, '');
  }

  return normalized;
}

export function normalizeAlias(alias?: string | null): string {
  const normalized = normalizeAliasOrEmpty(alias);
  return normalized === '' ? '/' : normalized;
}

export function getHomepageAlias(): string {
  const envAlias = import.meta.env.HOMEPAGE_ALIAS;
  const normalized = normalizeAliasOrEmpty(envAlias);
  if (normalized) {
    return normalized;
  }
  return DEFAULT_HOMEPAGE_ALIAS;
}

export function isHomepageAlias(alias?: string | null): boolean {
  if (!alias) {
    return false;
  }
  return normalizeAlias(alias) === getHomepageAlias();
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
  const normalized = normalizeAlias(alias);
  if (normalized === '/') {
    return undefined;
  }

  return normalized.replace(/^\//, '');
}
