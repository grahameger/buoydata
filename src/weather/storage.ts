import type {
  GribRequest,
  StoredGrib,
  WeatherStorage,
  WeatherStoragePaths,
  WeatherStorageWriteData,
} from './types';
import { getRequestVariant, padNumber } from './utils';

function joinFsPath(...parts: string[]): string {
  return parts
    .map(part => part.replace(/^[/\\]+|[/\\]+$/g, ''))
    .filter(Boolean)
    .join('/');
}

function dirnameFs(pathValue: string): string {
  const index = pathValue.lastIndexOf('/');
  if (index <= 0) {
    return '.';
  }
  return pathValue.slice(0, index);
}

export function buildGribStoragePaths(
  baseDir: string,
  request: GribRequest,
): WeatherStoragePaths {
  const hour = padNumber(request.run.hour, 2);
  const forecastHour = padNumber(request.forecastHour, 3);
  const variant = getRequestVariant(request);
  const suffix = variant ? `_${variant}` : '';
  const filename = `f${forecastHour}${suffix}.grib2`;
  const metadataName = `f${forecastHour}${suffix}.json`;
  const dir = joinFsPath(baseDir, request.model, request.run.date, hour);

  return {
    gribPath: joinFsPath(dir, filename),
    metadataPath: joinFsPath(dir, metadataName),
  };
}

function toUint8Array(buffer: ArrayBuffer | Uint8Array): Uint8Array {
  if (buffer instanceof Uint8Array) {
    return buffer;
  }
  return new Uint8Array(buffer);
}

export class LocalDiskStorage implements WeatherStorage {
  constructor(private readonly baseDir: string) {}

  getPaths(request: GribRequest): WeatherStoragePaths {
    return buildGribStoragePaths(this.baseDir, request);
  }

  async readMetadata(request: GribRequest): Promise<StoredGrib | null> {
    const { promises: fs } = await import('fs');
    const { metadataPath } = this.getPaths(request);
    try {
      const raw = await fs.readFile(metadataPath, 'utf8');
      return JSON.parse(raw) as StoredGrib;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async write(
    request: GribRequest,
    data: WeatherStorageWriteData,
  ): Promise<StoredGrib> {
    const { promises: fs, createWriteStream } = await import('fs');
    const { pipeline } = await import('stream/promises');
    const { gribPath, metadataPath } = this.getPaths(request);
    await fs.mkdir(dirnameFs(gribPath), { recursive: true });

    const tempPath = `${gribPath}.tmp-${Date.now()}`;

    if (data.stream) {
      await pipeline(data.stream, createWriteStream(tempPath));
    } else if (data.buffer) {
      await fs.writeFile(tempPath, toUint8Array(data.buffer));
    } else {
      throw new Error('WeatherStorage.write requires a stream or buffer.');
    }

    await fs.rename(tempPath, gribPath);
    const stats = await fs.stat(gribPath);

    const metadata: StoredGrib = {
      path: gribPath,
      metadataPath,
      bytes: stats.size,
      url: data.url,
      downloadedAt: new Date().toISOString(),
      request,
    };

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    return metadata;
  }
}
