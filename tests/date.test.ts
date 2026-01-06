import { describe, expect, it } from 'vitest';
import { getMeasurementDate } from '../src/utils/date';

const measurement = {
  year: 2026,
  month: 1,
  day: 6,
  hour: 16,
  minute: 40,
  airTemperature: 0,
  dewpointTemperature: 0,
  pressureTendancy: 0,
  seaLevelPressure: 0,
  stationVisibility: 0,
  water: {
    averagePeriod: 0,
    dominantDirection: 0,
    dominantPeriod: 0,
    significantHeight: 0,
    surfaceTemperature: 0,
    tide: 0,
  },
  wind: {
    averageSpeed: 0,
    direction: 0,
    peakGustSpeed: 0,
  },
};

describe('getMeasurementDate', () => {
  it('returns a UTC date', () => {
    const date = getMeasurementDate(measurement);
    expect(date.toISOString()).toBe('2026-01-06T16:40:00.000Z');
  });
});
