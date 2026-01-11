import { describe, expect, it } from 'vitest';
import { buildGribUrl } from '../src/weather/sources';
import { getModelUpdateStatus } from '../src/weather/update';
import type { GribRequest } from '../src/weather/types';

const SAN_DIEGO = { lat: 32.7157, lon: -117.1611 };

function formatRunDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

type ParsedGrib = {
  grib: {
    Nx: number;
    Ny: number;
    TypeOfProjection: number;
    gridTypeOfProjection?: number;
    DataValues?: number[][];
    getIxIy: (lon: number, lat: number) => [number, number];
  };
  values: number[];
};

async function fetchHrrrField(request: GribRequest): Promise<ParsedGrib> {
  const url = buildGribUrl(request);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch HRRR data: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();

  const gribModule = await import('grib2class');
  const Grib2Class = (gribModule as unknown as { default?: any }).default ?? gribModule;

  const grib = new Grib2Class({ log: false, numMembers: 1 });
  grib.parse(Buffer.from(buffer));
  grib.gridTypeOfProjection = grib.TypeOfProjection;

  const values = grib.DataValues?.[0];
  if (!values) {
    throw new Error('Missing decoded HRRR data values.');
  }

  return { grib, values };
}

describe('HRRR forecast wind (San Diego)', () => {
  it('fetches wind speed for now + 4 hours', async () => {
    const status = getModelUpdateStatus('hrrr');
    const runDate = formatRunDate(status.lastRun);
    const runHour = status.lastRun.getUTCHours();

    const baseRequest: Omit<GribRequest, 'variables'> = {
      model: 'hrrr',
      run: { date: runDate, hour: runHour },
      forecastHour: 4,
      region: { west: -118.5, south: 32.0, east: -116.5, north: 33.5 },
      levels: ['10_m_above_ground'],
    };

    const uResponse = await fetchHrrrField({
      ...baseRequest,
      variables: ['UGRD'],
    });
    const vResponse = await fetchHrrrField({
      ...baseRequest,
      variables: ['VGRD'],
    });

    const { grib } = uResponse;
    const [ix, iy] = grib.getIxIy(SAN_DIEGO.lon, SAN_DIEGO.lat);
    const i = Math.round(ix);
    const j = Math.round(iy);

    expect(grib.Nx).toBeGreaterThan(0);
    expect(grib.Ny).toBeGreaterThan(0);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(j).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(grib.Nx);
    expect(j).toBeLessThan(grib.Ny);

    const index = j * grib.Nx + i;
    const u = uResponse.values[index];
    const v = vResponse.values[index];

    const windSpeed = Math.sqrt(u * u + v * v);
    expect(Number.isFinite(windSpeed)).toBe(true);
    expect(windSpeed).toBeGreaterThanOrEqual(0);
  }, 120000);
});
