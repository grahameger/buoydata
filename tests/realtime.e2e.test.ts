import { describe, expect, it } from 'vitest';
import {
  buildRealtimeUrl,
  fetchRealtimeData,
  objectifyTable,
  parseRealtimeData,
  parseRealtimeTable,
} from '../src';

const SAMPLE_TEXT = `
#YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS TIDE
#yr mo dy hr mn degT m/s m/s m s s deg hPa degC degC degC nmi ft
2024 12 31 23 50 180 5.1 7.2 1.2 10 8 170 1015.2 12.3 14.1 8.2 5.0 0.8
2025 01 01 00 50 190 MM 8.0 1.0 9 7 180 1014.9 12.1 14.0 8.1 5.0 0.7
`.trim();

describe('realtime end-to-end', () => {
  it('fetches and parses realtime data into measurements', async () => {
    const buoyId = '46026';
    const expectedUrl = buildRealtimeUrl(buoyId);
    const fetchMock: typeof fetch = async url => {
      expect(url).toBe(expectedUrl);
      return {
        ok: true,
        status: 200,
        text: async () => SAMPLE_TEXT,
      } as Response;
    };

    const rawText = await fetchRealtimeData({ buoyId, fetch: fetchMock });
    const parsed = parseRealtimeData(buoyId, rawText);

    expect(parsed.id).toBe(buoyId);
    expect(parsed.measurements).toHaveLength(2);
    expect(parsed.measurements[0].wind.direction).toBe(180);
    expect(parsed.measurements[0].wind.averageSpeed).toBe(5.1);
    expect(parsed.measurements[0].water.significantHeight).toBe(1.2);
    expect(parsed.measurements[1].wind.averageSpeed).toBeNaN();
    expect(parsed.measurements[1].water.dominantPeriod).toBe(9);
  });

  it('includes unknown fields when requested', () => {
    const rawText = `
#YY MM DD hh mm FOO
#yr mo dy hr mn ---
2024 01 02 03 04 bar
`.trim();

    const parsed = parseRealtimeData('99999', rawText, {
      includeUnknownFields: true,
    });

    expect(parsed.measurements).toHaveLength(1);
    expect(parsed.measurements[0].FOO).toBe('bar');
  });

  it('parses live wind values for buoy 46086', async () => {
    const buoyId = '46086';
    const rawText = await fetchRealtimeData({ buoyId });
    const parsed = parseRealtimeData(buoyId, rawText);

    const table = parseRealtimeTable(rawText, { missingValue: Number.NaN });
    const records = objectifyTable(table);
    const hasWindValues = records.some(record => {
      const averageSpeed = Number(record.WSPD);
      const direction = Number(record.WDIR);
      return !Number.isNaN(averageSpeed) && !Number.isNaN(direction);
    });

    if (hasWindValues) {
      const hasWind = parsed.measurements.some(measurement => {
        const { averageSpeed, direction } = measurement.wind;
        return !Number.isNaN(averageSpeed) && !Number.isNaN(direction);
      });
      expect(hasWind).toBe(true);
    } else {
      expect(parsed.measurements.length).toBeGreaterThan(0);
      expect(typeof parsed.measurements[0].wind.averageSpeed).toBe('number');
      expect(typeof parsed.measurements[0].wind.direction).toBe('number');
    }
  });
});
