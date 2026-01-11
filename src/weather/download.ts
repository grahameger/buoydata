import path from 'path';
import { Readable } from 'stream';
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

const DEFAULT_STORAGE_ROOT = path.resolve(process.cwd(), 'weather-grib');

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
    new LocalDiskStorage(options.storageRoot ?? DEFAULT_STORAGE_ROOT);

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
    const stream = Readable.fromWeb(response.body);
    return storage.write(options.request, { url, stream });
  }

  const buffer = await response.arrayBuffer();
  return storage.write(options.request, { url, buffer });
}
