import type { QueryParams } from '../utils/url';

export type WeatherModel = 'hrrr' | 'nam' | 'gfs' | 'ecmwf';

export interface WeatherRun {
  date: string;
  hour: number;
}

export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface GribRequest {
  model: WeatherModel;
  run: WeatherRun;
  forecastHour: number;
  region?: BoundingBox;
  variables?: string[];
  levels?: string[];
  variant?: string;
}

export interface WeatherUpdateStatus {
  model: WeatherModel;
  cadenceHours: number;
  cycleHours: number[];
  availabilityDelayMinutes: number;
  lastRun: Date;
  nextRun: Date;
  lastUpdate: Date;
  nextUpdate: Date;
}

export interface WeatherStoragePaths {
  gribPath: string;
  metadataPath: string;
}

export interface StoredGrib {
  path: string;
  metadataPath: string;
  bytes: number;
  url: string;
  downloadedAt: string;
  request: GribRequest;
  checksum?: string;
}

export interface WeatherStorageWriteData {
  url: string;
  stream?: NodeJS.ReadableStream;
  buffer?: ArrayBuffer | Uint8Array;
}

export interface WeatherStorage {
  getPaths(request: GribRequest): WeatherStoragePaths;
  readMetadata(request: GribRequest): Promise<StoredGrib | null>;
  write(request: GribRequest, data: WeatherStorageWriteData): Promise<StoredGrib>;
}

export type MeteoblueQuery = QueryParams & {
  apikey?: string;
};
