import { LruCache } from '../utils/lru';
import { buildURL } from '../utils/url';

export interface FetchRealtimeOptions {
  buoyId: string;
  type?: string;
  fetch?: typeof fetch;
  requestInit?: RequestInit;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = 'https://www.ndbc.noaa.gov/data/realtime2/';
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_SIZE = 256;
const REALTIME_CACHE = new LruCache<string, string>(
  CACHE_MAX_SIZE,
  CACHE_TTL_MS,
);

export function buildRealtimeUrl(
  buoyId: string,
  type = 'txt',
  baseUrl = DEFAULT_BASE_URL,
): string {
  const filename = `${buoyId}.${type}`;
  return buildURL(baseUrl, filename);
}

export async function fetchRealtimeData(
  options: FetchRealtimeOptions,
): Promise<string> {
  const {
    buoyId,
    type = 'txt',
    fetch: fetchImpl = fetch,
    requestInit,
    baseUrl = DEFAULT_BASE_URL,
  } = options;

  if (!fetchImpl) {
    throw new Error('No fetch implementation available.');
  }

  const cacheKey = `${baseUrl}|${buoyId}|${type}`;
  const cached = REALTIME_CACHE.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const url = buildRealtimeUrl(buoyId, type, baseUrl);
  const response = await fetchImpl(url, requestInit);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const body = await response.text();
  REALTIME_CACHE.set(cacheKey, body);
  return body;
}
