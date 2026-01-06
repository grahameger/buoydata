import { buildURL } from '../utils/url';

export interface FetchRealtimeOptions {
  buoyId: string;
  type?: string;
  fetch?: typeof fetch;
  requestInit?: RequestInit;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = 'https://www.ndbc.noaa.gov/data/realtime2/';

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

  const url = buildRealtimeUrl(buoyId, type, baseUrl);
  const response = await fetchImpl(url, requestInit);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}
