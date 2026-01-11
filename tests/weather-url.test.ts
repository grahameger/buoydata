import { describe, expect, it } from 'vitest';
import { buildGribUrl } from '../src/weather/sources';

describe('weather URL builders', () => {
  it('builds a GFS filter URL when a region is provided', () => {
    const url = new URL(
      buildGribUrl({
        model: 'gfs',
        run: { date: '20240101', hour: 6 },
        forecastHour: 12,
        region: { west: -130, south: 20, east: -60, north: 55 },
        variables: ['TMP', 'var_UGRD'],
        levels: ['10_m_above_ground'],
      }),
    );

    expect(url.pathname).toBe('/cgi-bin/filter_gfs_0p25.pl');
    expect(url.searchParams.get('file')).toBe('gfs.t06z.pgrb2.0p25.f012');
    expect(url.searchParams.get('dir')).toBe('/gfs.20240101/06/atmos');
    expect(url.searchParams.get('leftlon')).toBe('-130');
    expect(url.searchParams.get('rightlon')).toBe('-60');
    expect(url.searchParams.get('toplat')).toBe('55');
    expect(url.searchParams.get('bottomlat')).toBe('20');
    expect(url.searchParams.get('var_TMP')).toBe('on');
    expect(url.searchParams.get('var_UGRD')).toBe('on');
    expect(url.searchParams.get('lev_10_m_above_ground')).toBe('on');
  });

  it('builds a direct HRRR URL when no filters are provided', () => {
    const url = buildGribUrl({
      model: 'hrrr',
      run: { date: '20240101', hour: 1 },
      forecastHour: 3,
    });
    const parsed = new URL(url);
    const suffix = 'hrrr.20240101/conus/hrrr.t01z.wrfsfcf03.grib2';

    expect(
      [
        'noaa-hrrr-bdp-pds.s3.amazonaws.com',
        'storage.googleapis.com',
      ].includes(parsed.hostname),
    ).toBe(true);
    expect(parsed.pathname.endsWith(suffix)).toBe(true);
  });
});
