import { describe, expect, it } from 'vitest';
import { buildGribStoragePaths } from '../src/weather/storage';

describe('weather storage paths', () => {
  it('adds a variant suffix when filters are provided', () => {
    const paths = buildGribStoragePaths('/data', {
      model: 'gfs',
      run: { date: '20240101', hour: 6 },
      forecastHour: 12,
      region: { west: -130, south: 20, east: -60, north: 55 },
    });

    const gribPath = paths.gribPath.replace(/\\/g, '/');
    const metadataPath = paths.metadataPath.replace(/\\/g, '/');

    expect(gribPath).toMatch(
      /\/data\/gfs\/20240101\/06\/f012_[a-f0-9]{12}\.grib2$/,
    );
    expect(metadataPath).toMatch(
      /\/data\/gfs\/20240101\/06\/f012_[a-f0-9]{12}\.json$/,
    );
  });
});
