import { performance } from 'node:perf_hooks';
import { DEFAULT_TIMEOUT_MS } from './constants.js';

const sanitizeUrl = (url) => {
  if (!url) {
    throw new Error('URL is required for SSR fetch helper');
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `http://${url.replace(/^\/+/, '')}`;
};

const recordTiming = async (fetchPromise) => {
  const start = performance.now();
  try {
    const result = await fetchPromise();
    const durationMs = performance.now() - start;
    return { result, durationMs };
  } catch (error) {
    const durationMs = performance.now() - start;
    throw Object.assign(error, { durationMs });
  }
};

const readBody = async (response, readMode = 'text') => {
  if (!response) {
    return '';
  }

  if (readMode === 'json') {
    return response.json();
  }

  if (readMode === 'arrayBuffer') {
    return response.arrayBuffer();
  }

  return response.text();
};

export const timedFetch = async (
  url,
  {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    readMode = 'text',
    fetchImpl = globalThis.fetch
  } = {}
) => {
  const normalizedUrl = sanitizeUrl(url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { result: response, durationMs } = await recordTiming(() =>
      fetchImpl(normalizedUrl, {
        method,
        headers,
        body,
        signal: controller.signal
      })
    );

    const payload = await readBody(response, readMode).catch(() => null);

    return {
      url: normalizedUrl,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      durationMs,
      headers: {
        'content-type': response.headers.get('content-type'),
        'cache-control': response.headers.get('cache-control'),
        etag: response.headers.get('etag')
      },
      body: payload
    };
  } catch (error) {
    return {
      url: normalizedUrl,
      ok: false,
      status: 0,
      statusText: error.name,
      durationMs: error.durationMs ?? null,
      error: error.message ?? 'Unknown fetch error'
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

export const compareResponses = (left, right) => ({
  statusMatch: left.status === right.status,
  contentTypeMatch: left.headers?.['content-type'] === right.headers?.['content-type'],
  cacheControlMatch: left.headers?.['cache-control'] === right.headers?.['cache-control'],
  etagMatch: left.headers?.etag && right.headers?.etag
    ? left.headers.etag === right.headers.etag
    : left.headers?.etag === right.headers?.etag,
  durationDeltaMs:
    left.durationMs !== null && right.durationMs !== null
      ? Math.abs(left.durationMs - right.durationMs)
      : null
});

export const ensureAbsoluteUrl = sanitizeUrl;
