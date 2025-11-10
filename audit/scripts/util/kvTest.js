import crypto from 'node:crypto';
import { DEFAULT_TIMEOUT_MS } from './constants.js';

const normalizeEndpoint = (baseUrl, route = '/kv-check') => {
  if (!baseUrl) {
    throw new Error('KV test helper requires a baseUrl');
  }

  const normalizedBase = baseUrl.replace(/\/$/, '');
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
  return `${normalizedBase}${normalizedRoute}`;
};

const timedRequest = async (fetchImpl, url, init, timeoutMs) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const response = await fetchImpl(url, {
      ...init,
      signal: controller.signal
    });
    const durationMs = Date.now() - start;
    return { response, durationMs };
  } finally {
    clearTimeout(timeoutId);
  }
};

const parseJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return {
      error: `Failed to parse JSON from ${response.url}: ${error.message}`
    };
  }
};

export const runKvProbe = async ({
  baseUrl,
  route = '/kv-check',
  key,
  value,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  cleanup = true
} = {}) => {
  const endpoint = normalizeEndpoint(baseUrl, route);
  const probeKey = key ?? `audit-kv-${crypto.randomUUID()}`;
  const probeValue = value ?? `audit-${crypto.randomUUID()}`;

  const summary = {
    endpoint,
    key: probeKey,
    attemptedValue: probeValue,
    write: null,
    read: null,
    delete: null,
    success: false
  };

  try {
    const { response: writeResponse, durationMs: writeDuration } = await timedRequest(
      fetchImpl,
      endpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'write', key: probeKey, value: probeValue })
      },
      timeoutMs
    );

    summary.write = {
      status: writeResponse.status,
      ok: writeResponse.ok,
      durationMs: writeDuration,
      body: await parseJson(writeResponse)
    };

    if (!writeResponse.ok) {
      return summary;
    }

    const readUrl = `${endpoint}?key=${encodeURIComponent(probeKey)}`;
    const { response: readResponse, durationMs: readDuration } = await timedRequest(
      fetchImpl,
      readUrl,
      { method: 'GET' },
      timeoutMs
    );

    summary.read = {
      status: readResponse.status,
      ok: readResponse.ok,
      durationMs: readDuration,
      body: await parseJson(readResponse)
    };

    if (!readResponse.ok) {
      return summary;
    }

    const readValue = summary.read.body?.value;
    summary.success = readValue === probeValue;

    if (cleanup) {
      const { response: deleteResponse, durationMs: deleteDuration } = await timedRequest(
        fetchImpl,
        endpoint,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', key: probeKey })
        },
        timeoutMs
      );

      summary.delete = {
        status: deleteResponse.status,
        ok: deleteResponse.ok,
        durationMs: deleteDuration,
        body: await parseJson(deleteResponse)
      };
    }

    return summary;
  } catch (error) {
    summary.error = error.message;
    return summary;
  }
};
