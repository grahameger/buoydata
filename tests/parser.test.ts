import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  objectifyTable,
  parseRealtimeData,
  parseRealtimeTable,
  parseRealtimeTableFrame,
  parseRow,
  toDataFrame,
} from '../src/realtime/parser';

const fixtures = (name: string) =>
  readFileSync(join(__dirname, 'fixtures', name), 'utf8');

describe('parseRow', () => {
  it('splits by whitespace and handles missing values', () => {
    const row = parseRow('2026 01 MM 99 99.0 999', {
      missingValue: null,
    });
    expect(row).toEqual([2026, 1, null, null, null, null]);
  });
});

describe('parseRealtimeTable', () => {
  it('parses standard met data', () => {
    const table = parseRealtimeTable(fixtures('46026.txt'));
    expect(table.headers.slice(0, 5)).toEqual(['#YY', 'MM', 'DD', 'hh', 'mm']);
    expect(table.units.slice(0, 5)).toEqual(['yr', 'mo', 'dy', 'hr', 'mn']);
    expect(table.rows.length).toBeGreaterThan(0);
  });

  it('parses wave summary data', () => {
    const table = parseRealtimeTable(fixtures('46026.spec'));
    expect(table.headers).toContain('WVHT');
    expect(table.rows[0][0]).toEqual(2026);
  });

  it('parses continuous wind data and flags missing 9s', () => {
    const table = parseRealtimeTable(fixtures('AMAA2.cwind'));
    const rowWithMissing = table.rows.find(row => row.includes(null));
    expect(rowWithMissing).toBeDefined();
  });

  it('parses drift data', () => {
    const table = parseRealtimeTable(fixtures('22101.drift'));
    expect(table.headers).toContain('LAT');
    expect(table.headers).toContain('LON');
  });
});

describe('objectifyTable', () => {
  it('maps rows to keyed objects', () => {
    const table = parseRealtimeTable(fixtures('46026.txt'));
    const records = objectifyTable(table);
    expect(records[0]['#YY']).toBe(2026);
    expect(records[0].WDIR).toBeDefined();
  });
});

describe('parseRealtimeTableFrame', () => {
  it('parses realtime data into a dataframe', () => {
    const table = parseRealtimeTableFrame(fixtures('46026.txt'));
    expect(table.frame.columns.slice(0, 5)).toEqual([
      '#YY',
      'MM',
      'DD',
      'hh',
      'mm',
    ]);
    expect(table.frame.height).toBeGreaterThan(0);
  });
});

describe('toDataFrame', () => {
  it('converts parsed tables into a dataframe', () => {
    const table = parseRealtimeTable(fixtures('46026.txt'));
    const frame = toDataFrame(table);
    expect(frame.columns).toEqual(table.headers);
    expect(frame.height).toBe(table.rows.length);
  });
});

describe('parseRealtimeData', () => {
  it('maps standard fields into measurements', () => {
    const data = parseRealtimeData('46026', fixtures('46026.txt'));
    expect(data.id).toBe('46026');
    expect(data.measurements.length).toBeGreaterThan(0);
    expect(data.measurements[0].year).toBe(2026);
    expect(data.measurements[0].water.significantHeight).toBe(2.2);
  });

  it('can include unknown fields when requested', () => {
    const sample = `#YY MM DD hh mm FOO BAR\n#yr mo dy hr mn - -\n2026 01 06 16 40 1 2`;
    const data = parseRealtimeData('0000', sample, {
      includeUnknownFields: true,
    });
    const measurement = data.measurements[0] as Record<string, unknown>;
    expect(measurement.FOO).toBe(1);
    expect(measurement.BAR).toBe(2);
  });
});
