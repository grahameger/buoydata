import { buildGribUrl, type WeatherSourceConfig } from './sources';
import type { GribRequest, StoredGrib, WeatherStorage } from './types';
import { LocalDiskStorage } from './storage';

export interface FetchGribOptions {
  fetch?: typeof fetch;
  requestInit?: RequestInit;
  sourceConfig?: WeatherSourceConfig;
}

export interface DownloadGribOptions extends FetchGribOptions {
  request: GribRequest;
  storage?: WeatherStorage;
  storageRoot?: string;
  skipIfExists?: boolean;
}

const FALLBACK_STORAGE_ROOT = 'weather-grib';

async function resolveDefaultStorageRoot(): Promise<string> {
  if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
    const path = await import('path');
    return path.resolve(process.cwd(), FALLBACK_STORAGE_ROOT);
  }
  return FALLBACK_STORAGE_ROOT;
}

export async function fetchGrib(
  request: GribRequest,
  options: FetchGribOptions = {},
): Promise<ArrayBuffer> {
  const fetchImpl = options.fetch ?? fetch;
  if (!fetchImpl) {
    throw new Error('No fetch implementation available.');
  }

  const url = buildGribUrl(request, options.sourceConfig);
  const response = await fetchImpl(url, options.requestInit);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.arrayBuffer();
}

export async function downloadGrib(
  options: DownloadGribOptions,
): Promise<StoredGrib> {
  const fetchImpl = options.fetch ?? fetch;
  if (!fetchImpl) {
    throw new Error('No fetch implementation available.');
  }

  const storage =
    options.storage ??
    new LocalDiskStorage(
      options.storageRoot ?? (await resolveDefaultStorageRoot()),
    );

  if (options.skipIfExists) {
    const existing = await storage.readMetadata(options.request);
    if (existing) {
      return existing;
    }
  }

  const url = buildGribUrl(options.request, options.sourceConfig);
  const response = await fetchImpl(url, options.requestInit);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  if (response.body) {
    const { Readable } = await import('stream');
    const stream = Readable.fromWeb(response.body as any);
    return storage.write(options.request, { url, stream });
  }

  const buffer = await response.arrayBuffer();
  return storage.write(options.request, { url, buffer });
}
