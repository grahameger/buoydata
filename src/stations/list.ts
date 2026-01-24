import { LruCache } from '../utils/lru';

export interface FetchBuoyListOptions {
  fetch?: typeof fetch;
  requestInit?: RequestInit;
  /**
   * URL for the active station XML feed. Defaults to NDBC.
   */
  activeUrl?: string;
  /**
   * URL for the full station catalog. Defaults to NDBC.
   */
  stationTableUrl?: string;
  /**
   * When true, includes inactive stations from the catalog.
   */
  includeInactive?: boolean;
}

export interface FetchStationIndexOptions extends FetchBuoyListOptions {}

export interface StationIndex {
  /** Active station IDs from the XML feed. */
  active: readonly string[];
  /** All stations from the catalog (includes inactive when available). */
  all: readonly string[];
  /** Efficient membership check for active stations. */
  isActive: (id: string) => boolean;
}

const DEFAULT_ACTIVE_STATIONS_URL = 'https://www.ndbc.noaa.gov/activestations.xml';
const DEFAULT_STATION_TABLE_URL =
  'https://www.ndbc.noaa.gov/data/stations/station_table.txt';

const ACTIVE_CACHE_TTL_MS = 10 * 60 * 1000;
const ACTIVE_CACHE_MAX_SIZE = 8;
const STATION_TABLE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const STATION_TABLE_CACHE_MAX_SIZE = 8;

const ACTIVE_CACHE = new LruCache<
  string,
  { ids: readonly string[]; set: ReadonlySet<string> }
>(ACTIVE_CACHE_MAX_SIZE, ACTIVE_CACHE_TTL_MS);

const STATION_TABLE_CACHE = new LruCache<string, readonly string[]>(
  STATION_TABLE_CACHE_MAX_SIZE,
  STATION_TABLE_CACHE_TTL_MS,
);

function parseActiveStationsXml(rawText: string): { ids: string[]; set: Set<string> } {
  const ids: string[] = [];
  const set = new Set<string>();
  const regex = /<station[^>]*\bid="([A-Za-z0-9]{3,10})"/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(rawText)) !== null) {
    const rawId = match[1];
    if (!rawId) {
      continue;
    }
    const id = rawId.toUpperCase();
    if (set.has(id)) {
      continue;
    }
    set.add(id);
    ids.push(id);
  }

  return { ids, set };
}

function parseStationTable(rawText: string): string[] {
  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));

  if (lines.length === 0) {
    return [];
  }

  const ids: string[] = [];
  const seen = new Set<string>();

  lines.forEach(line => {
    const [rawId] = line.split('|');
    if (!rawId) {
      return;
    }
    const id = rawId.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,10}$/.test(id)) {
      return;
    }
    if (seen.has(id)) {
      return;
    }
    seen.add(id);
    ids.push(id);
  });

  return ids;
}

async function fetchActiveStations(
  fetchImpl: typeof fetch,
  activeUrl: string,
  requestInit?: RequestInit,
): Promise<{ ids: readonly string[]; set: ReadonlySet<string> }> {
  const cached = ACTIVE_CACHE.get(activeUrl);
  if (cached !== undefined) {
    return cached;
  }

  const response = await fetchImpl(activeUrl, requestInit);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${activeUrl}: ${response.status}`);
  }

  const body = await response.text();
  const parsed = parseActiveStationsXml(body);
  ACTIVE_CACHE.set(activeUrl, parsed);
  return parsed;
}

async function fetchStationTable(
  fetchImpl: typeof fetch,
  stationTableUrl: string,
  requestInit?: RequestInit,
): Promise<readonly string[]> {
  const cached = STATION_TABLE_CACHE.get(stationTableUrl);
  if (cached !== undefined) {
    return cached;
  }

  const response = await fetchImpl(stationTableUrl, requestInit);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${stationTableUrl}: ${response.status}`);
  }

  const body = await response.text();
  const parsed = parseStationTable(body);
  STATION_TABLE_CACHE.set(stationTableUrl, parsed);
  return parsed;
}

export async function fetchStationIndex(
  options: FetchStationIndexOptions = {},
): Promise<StationIndex> {
  const {
    fetch: fetchImpl = fetch,
    requestInit,
    activeUrl = DEFAULT_ACTIVE_STATIONS_URL,
    stationTableUrl = DEFAULT_STATION_TABLE_URL,
    includeInactive,
  } = options;

  if (!fetchImpl) {
    throw new Error('No fetch implementation available.');
  }

  const active = await fetchActiveStations(fetchImpl, activeUrl, requestInit);

  const all = includeInactive
    ? await fetchStationTable(fetchImpl, stationTableUrl, requestInit)
    : active.ids;

  const activeSet = active.set;

  return {
    active: active.ids,
    all,
    isActive: (id: string) => activeSet.has(id.toUpperCase()),
  };
}

export async function fetchBuoyList(
  options: FetchBuoyListOptions = {},
): Promise<string[]> {
  const index = await fetchStationIndex(options);
  return options.includeInactive ? Array.from(index.all) : Array.from(index.active);
}
