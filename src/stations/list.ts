import { LruCache } from '../utils/lru';

export interface FetchBuoyListOptions {
  fetch?: typeof fetch;
  requestInit?: RequestInit;
  url?: string;
}

const DEFAULT_BUOY_LIST_URL = 'https://www.ndbc.noaa.gov/activestations.txt';
const BUOY_LIST_CACHE_TTL_MS = 4 * 60 * 60 * 1000;
const BUOY_LIST_CACHE_MAX_SIZE = 16;
const BUOY_LIST_CACHE = new LruCache<string, string[]>(
  BUOY_LIST_CACHE_MAX_SIZE,
  BUOY_LIST_CACHE_TTL_MS,
);

function parseBuoyList(rawText: string): string[] {
  const ids = new Set<string>();

  rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .forEach(line => {
      if (line.startsWith('#')) {
        return;
      }

      const [token] = line.split(/\s+/);
      if (!token) {
        return;
      }

      const normalized = token.toUpperCase();
      if (normalized === 'STATION' || normalized === 'STN') {
        return;
      }

      if (!/^[A-Z0-9]{3,10}$/.test(normalized)) {
        return;
      }

      ids.add(normalized);
    });

  return Array.from(ids);
}

export async function fetchBuoyList(
  options: FetchBuoyListOptions = {},
): Promise<string[]> {
  const { fetch: fetchImpl = fetch, requestInit, url = DEFAULT_BUOY_LIST_URL } =
    options;

  if (!fetchImpl) {
    throw new Error('No fetch implementation available.');
  }

  const cached = BUOY_LIST_CACHE.get(url);
  if (cached !== undefined) {
    return cached;
  }

  const response = await fetchImpl(url, requestInit);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const body = await response.text();
  const list = parseBuoyList(body);
  BUOY_LIST_CACHE.set(url, list);
  return list;
}
