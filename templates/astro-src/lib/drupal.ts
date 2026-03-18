/**
 * Drupal data client used by Astro at build time and during local dev.
 *
 * - Page content: Drupal JSON:API
 * - Navigation menus: Drupal Linkset endpoint
 */

import { Jsona } from 'jsona';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';

const dataFormatter: Jsona = new Jsona();
const DEFAULT_HOMEPAGE_ALIAS = '/home';
const PAGE_QUERY_FIELDS = ['title', 'body', 'path', 'status', 'created', 'changed'];
const PAGE_MEDIA_FIELDS = ['name', 'field_media_image'];
const PAGE_FILE_FIELDS = ['uri', 'image_style_uri'];
const PAGE_INCLUDE_FIELDS = ['field_hero_image', 'field_hero_image.field_media_image'];
const menuCache = new Map<string, Promise<DrupalMenuItem[]>>();
let pageQueryMode: 'basic' | 'with-images' | undefined;

interface JsonApiResourceIdentifier {
  id: string;
  type: string;
  meta?: Record<string, unknown>;
}

interface JsonApiRelationship {
  data?: JsonApiResourceIdentifier | JsonApiResourceIdentifier[] | null;
}

interface JsonApiResource {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, JsonApiRelationship>;
}

interface JsonApiDocument {
  data?: JsonApiResource[] | JsonApiResource | null;
  included?: JsonApiResource[];
  links?: {
    next?: {
      href?: string;
    };
  };
}

export interface DrupalPageImage {
  alt?: string;
  mediaName?: string;
  originalSrc?: string;
  styles: Record<string, string>;
}

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
  heroImage?: DrupalPageImage;
}

export interface DrupalMenuItem {
  title: string;
  href: string;
  children: DrupalMenuItem[];
  description?: string;
  external?: boolean;
}

interface LinksetItem {
  href?: unknown;
  title?: unknown;
  hierarchy?: unknown;
  description?: unknown;
}

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

function buildPageQueryParams(limit: number, mode: 'basic' | 'with-images' = 'with-images'): DrupalJsonApiParams {
  const params = new DrupalJsonApiParams();
  const pageFields = mode === 'with-images' ? [...PAGE_QUERY_FIELDS, 'field_hero_image'] : PAGE_QUERY_FIELDS;

  params.addFilter('status', '1').addFields('node--page', pageFields).addPageLimit(limit);

  if (mode === 'with-images') {
    params
      .addFields('media--image', PAGE_MEDIA_FIELDS)
      .addFields('file--file', PAGE_FILE_FIELDS)
      .addInclude(PAGE_INCLUDE_FIELDS);
  }

  return params;
}

function getPageCollectionUrl(limit: number, mode: 'basic' | 'with-images' = 'with-images'): string {
  const jsonApiBase = getDrupalJsonApiBaseUrl();
  const params = buildPageQueryParams(limit, mode);
  return `${jsonApiBase}/node/page?${params.getQueryString()}`;
}

export async function checkApiConnection(): Promise<void> {
  const endpoint = getPageCollectionUrl(1, 'basic');
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`JSON:API page collection ${endpoint} returned ${response.status}: ${response.statusText}`);
  }
}

export async function getAllPages(): Promise<DrupalPage[]> {
  const allPages: DrupalPage[] = [];
  let activeMode: 'basic' | 'with-images' = pageQueryMode ?? 'with-images';
  let nextUrl: string | null = getPageCollectionUrl(50, activeMode);

  while (nextUrl) {
    const response = await fetch(nextUrl);

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      if (
        activeMode === 'with-images'
        && allPages.length === 0
        && shouldRetryWithoutImages(response.status, detail)
      ) {
        activeMode = 'basic';
        pageQueryMode = 'basic';
        nextUrl = getPageCollectionUrl(50, activeMode);
        continue;
      }

      throw new Error(`Failed to fetch pages: ${response.status} ${response.statusText}${detail ? ` - ${detail}` : ''}`);
    }

    pageQueryMode = activeMode;

    const json = await response.json() as JsonApiDocument;
    const pages = dataFormatter.deserialize(json) as DrupalPage | DrupalPage[];
    const rawPages = normalizeJsonApiData(json.data);
    const includedMap = createIncludedResourceMap(json.included);
    const rawPageMap = new Map(rawPages.map((page) => [getResourceKey(page.type, page.id), page]));
    const normalizedPages = Array.isArray(pages) ? pages : (pages ? [pages] : []);

    for (const page of normalizedPages) {
      const rawPage = rawPageMap.get(getResourceKey(page.type, page.id));
      const heroImage = rawPage ? extractHeroImage(rawPage, includedMap) : undefined;
      allPages.push(heroImage ? { ...page, heroImage } : page);
    }

    nextUrl = json.links?.next?.href || null;
  }

  return allPages;
}

function shouldRetryWithoutImages(status: number, detail: string): boolean {
  if (status !== 400) {
    return false;
  }

  return /field_hero_image|media--image|file--file|include/i.test(detail);
}

function getResourceKey(type: string, id: string): string {
  return `${type}:${id}`;
}

function normalizeJsonApiData(data: JsonApiDocument['data']): JsonApiResource[] {
  if (Array.isArray(data)) {
    return data;
  }
  return data ? [data] : [];
}

function createIncludedResourceMap(included?: JsonApiResource[]): Map<string, JsonApiResource> {
  const entries = Array.isArray(included) ? included : [];
  return new Map(entries.map((resource) => [getResourceKey(resource.type, resource.id), resource]));
}

function getSingleRelationshipIdentifier(
  resource: JsonApiResource,
  relationshipName: string,
): JsonApiResourceIdentifier | undefined {
  const relationship = resource.relationships?.[relationshipName]?.data;
  if (!relationship || Array.isArray(relationship)) {
    return undefined;
  }
  return relationship;
}

function getIncludedRelationshipResource(
  resource: JsonApiResource,
  relationshipName: string,
  includedMap: Map<string, JsonApiResource>,
): { identifier?: JsonApiResourceIdentifier; resource?: JsonApiResource } {
  const identifier = getSingleRelationshipIdentifier(resource, relationshipName);
  if (!identifier) {
    return {};
  }

  return {
    identifier,
    resource: includedMap.get(getResourceKey(identifier.type, identifier.id)),
  };
}

function extractStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, candidate]) => typeof candidate === 'string' && candidate.trim() !== ''),
  );
}

function extractOriginalSrc(fileResource?: JsonApiResource): string | undefined {
  const uri = fileResource?.attributes?.uri;
  if (!uri || typeof uri !== 'object' || Array.isArray(uri)) {
    return undefined;
  }

  const url = (uri as { url?: unknown }).url;
  return typeof url === 'string' && url.trim() !== '' ? url : undefined;
}

function extractHeroImage(
  pageResource: JsonApiResource,
  includedMap: Map<string, JsonApiResource>,
): DrupalPageImage | undefined {
  const mediaRelationship = getIncludedRelationshipResource(pageResource, 'field_hero_image', includedMap);
  if (!mediaRelationship.resource) {
    return undefined;
  }

  const fileRelationship = getIncludedRelationshipResource(mediaRelationship.resource, 'field_media_image', includedMap);
  const styles = extractStringRecord(fileRelationship.resource?.attributes?.image_style_uri);
  const originalSrc = extractOriginalSrc(fileRelationship.resource);
  const meta = fileRelationship.identifier?.meta || {};
  const alt = typeof meta.alt === 'string' && meta.alt.trim() !== '' ? meta.alt : undefined;
  const mediaName = typeof mediaRelationship.resource.attributes?.name === 'string'
    ? mediaRelationship.resource.attributes.name
    : undefined;

  if (!originalSrc && Object.keys(styles).length === 0) {
    return undefined;
  }

  return {
    alt,
    mediaName,
    originalSrc,
    styles,
  };
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

export function aliasToSlug(alias: string): string | undefined {
  const normalized = normalizeAlias(alias);
  if (normalized === '/') {
    return undefined;
  }

  return normalized.replace(/^\//, '');
}

function normalizeMenuHref(href: string): { href: string; external: boolean } {
  const trimmed = href.trim();

  if (trimmed === '') {
    return { href: '/', external: false };
  }

  if (trimmed.startsWith('/')) {
    return { href: trimmed, external: false };
  }

  const baseUrl = new URL(getDrupalBaseUrl());

  try {
    const candidate = new URL(trimmed, baseUrl);
    const candidateHref = `${candidate.pathname}${candidate.search}${candidate.hash}` || '/';

    if (candidate.origin === baseUrl.origin) {
      return { href: candidateHref, external: false };
    }

    return { href: candidate.toString(), external: true };
  } catch {
    // Keep unknown schemes (mailto:, tel:, etc.) as-is.
    const knownScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
    return { href: trimmed, external: knownScheme };
  }
}

function pathKey(hierarchy: string[]): string {
  return hierarchy.join('.');
}

function buildMenuTree(items: Array<{ hierarchy: string[]; node: DrupalMenuItem }>): DrupalMenuItem[] {
  const nodes = new Map<string, DrupalMenuItem>();
  const roots: DrupalMenuItem[] = [];

  const sorted = [...items].sort((a, b) => {
    if (a.hierarchy.length !== b.hierarchy.length) {
      return a.hierarchy.length - b.hierarchy.length;
    }
    return pathKey(a.hierarchy).localeCompare(pathKey(b.hierarchy), undefined, { numeric: true });
  });

  for (const item of sorted) {
    nodes.set(pathKey(item.hierarchy), item.node);
  }

  for (const item of sorted) {
    if (item.hierarchy.length <= 1) {
      roots.push(item.node);
      continue;
    }

    const parent = nodes.get(pathKey(item.hierarchy.slice(0, -1)));
    if (!parent) {
      console.warn(`[drupal] Menu hierarchy missing parent for "${item.node.title}"; rendering as top-level.`);
      roots.push(item.node);
      continue;
    }
    parent.children.push(item.node);
  }

  return roots;
}

function normalizeLinksetPayload(payload: unknown): DrupalMenuItem[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const linksetArray = (payload as { linkset?: unknown }).linkset;
  if (!Array.isArray(linksetArray) || linksetArray.length === 0) {
    return [];
  }

  const rawItems: LinksetItem[] = [];
  for (const set of linksetArray) {
    if (!set || typeof set !== 'object') {
      continue;
    }

    const itemArray = (set as { item?: unknown }).item;
    if (!Array.isArray(itemArray)) {
      continue;
    }

    rawItems.push(...(itemArray as LinksetItem[]));
  }

  const normalizedItems: Array<{ hierarchy: string[]; node: DrupalMenuItem }> = [];

  for (const item of rawItems) {
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const hrefRaw = typeof item.href === 'string' ? item.href.trim() : '';

    if (!title || !hrefRaw) {
      console.warn('[drupal] Skipping menu item with missing title or href from Linkset response.');
      continue;
    }

    const { href, external } = normalizeMenuHref(hrefRaw);
    const description = typeof item.description === 'string' ? item.description : undefined;

    const hierarchy = Array.isArray(item.hierarchy)
      ? item.hierarchy.map((segment) => String(segment).trim()).filter(Boolean)
      : [];

    normalizedItems.push({
      hierarchy: hierarchy.length > 0 ? hierarchy : [String(normalizedItems.length)],
      node: {
        title,
        href,
        children: [],
        description,
        external,
      },
    });
  }

  return buildMenuTree(normalizedItems);
}

function linksetErrorHint(endpoint: string): string {
  return `Required Drupal Linkset endpoint unavailable: ${endpoint}. Confirm Linkset is enabled (system.feature_flags.linkset_endpoint=true) and rebuild caches with "ddev exec drush cr".`;
}

export async function getMenu(
  menuName: string,
  options: { required?: boolean } = {},
): Promise<DrupalMenuItem[]> {
  const required = options.required ?? false;
  const endpoint = `${getDrupalBaseUrl()}/system/menu/${encodeURIComponent(menuName)}/linkset`;
  const useCache = !import.meta.env.DEV;

  const loadMenu = async (): Promise<DrupalMenuItem[]> => {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        if (required) {
          throw new Error(`${linksetErrorHint(endpoint)} Received ${response.status} ${response.statusText}.`);
        }
        console.warn(
          `[drupal] Optional Drupal Linkset endpoint unavailable (${menuName}): ${endpoint} (${response.status} ${response.statusText}).`,
        );
        return [];
      }

      const payload = await response.json();
      const menu = normalizeLinksetPayload(payload);

      if (required && menu.length === 0) {
        throw new Error(`${linksetErrorHint(endpoint)} Endpoint returned no usable menu items.`);
      }

      if (!required && menu.length === 0) {
        console.warn(`[drupal] Optional menu "${menuName}" is empty; rendering without it.`);
      }

      return menu;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (required) {
        throw new Error(message);
      }
      console.warn(`[drupal] Optional menu "${menuName}" failed to load from ${endpoint}: ${message}`);
      return [];
    }
  };

  if (!useCache) {
    return loadMenu();
  }

  if (!menuCache.has(menuName)) {
    menuCache.set(menuName, loadMenu());
  }

  return menuCache.get(menuName)!;
}
