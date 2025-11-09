import { Jsona } from 'jsona';
import DrupalJsonApiParams from 'drupal-jsonapi-params';
import { DEFAULT_TIMEOUT_MS } from './constants.js';

const buildFormatter = () => new Jsona();

const normalizeBaseUrl = (value) => {
  if (!value) {
    throw new Error('JSON:API client requires a baseUrl');
  }
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const isDrupalParams = (params) =>
  params && typeof params === 'object' && typeof params.getQueryString === 'function';

const serializeParams = (params) => {
  if (!params) {
    return '';
  }

  if (typeof params === 'string') {
    return params.startsWith('?') ? params : `?${params}`;
  }

  if (isDrupalParams(params)) {
    const value = params.getQueryString();
    return value ? `?${value}` : '';
  }

  const urlSearch = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => urlSearch.append(key, v));
      return;
    }

    if (value !== undefined && value !== null) {
      urlSearch.set(key, String(value));
    }
  });

  const serialized = urlSearch.toString();
  return serialized ? `?${serialized}` : '';
};

const withTimeout = async (promiseFactory, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await promiseFactory(controller);
  } finally {
    clearTimeout(timeoutId);
  }
};

const handleResponse = async (response, formatter) => {
  const elapsed = response.headers.get('x-response-time');
  const raw = await response.json();
  const data = formatter.deserialize(raw);
  return { data, raw, elapsed };
};

export const createJsonApiClient = ({
  baseUrl,
  headers = {},
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) => {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const formatter = buildFormatter();

  const buildUrl = (resourceType, params) => {
    const sanitized = resourceType.replace(/^\/+/, '');
    return `${normalizedBaseUrl}/${sanitized}${serializeParams(params)}`;
  };

  const fetchJson = async (url, init = {}) => {
    const start = Date.now();

    const response = await withTimeout(
      async (controller) =>
        fetchImpl(url, {
          method: 'GET',
          headers: {
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            ...headers,
            ...init.headers
          },
          signal: controller.signal,
          ...init
        }),
      timeoutMs
    );

    const durationMs = Date.now() - start;

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '<unavailable>');
      throw new Error(
        `JSON:API request failed (${response.status} ${response.statusText}) for ${url}: ${bodyText}`
      );
    }

    const parsed = await handleResponse(response, formatter);

    return {
      ...parsed,
      meta: {
        url,
        status: response.status,
        durationMs
      }
    };
  };

  const fetchCollection = async (resourceType, params, init = {}) => {
    const url = buildUrl(resourceType, params);
    return fetchJson(url, init);
  };

  const fetchResource = async (resourceType, id, params, init = {}) => {
    if (!id) {
      throw new Error('fetchResource requires an id parameter');
    }
    const resourcePath = `${resourceType.replace(/\/+$/, '')}/${encodeURIComponent(id)}`;
    const url = buildUrl(resourcePath, params);
    return fetchJson(url, init);
  };

  return {
    buildUrl,
    fetchCollection,
    fetchResource,
    formatter,
    paramsBuilder: () => new DrupalJsonApiParams(),
    get baseUrl() {
      return normalizedBaseUrl;
    }
  };
};

export { DrupalJsonApiParams };
