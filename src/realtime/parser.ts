import { BuoyData, Measurement } from '../models/measurement';
import {
  DataFrame,
  DataFrameColumn,
  ParsedValue,
  RealtimeRecord,
  RealtimeTable,
  RealtimeTableFrame,
} from '../models/table';

export interface ParseRowOptions {
  coerceNumbers?: boolean;
  missingValue?: number | null;
  missingTokens?: string[];
}

export interface ParseRealtimeTableOptions extends ParseRowOptions {
  commentPrefix?: string;
}

export interface ParseRealtimeDataOptions extends ParseRealtimeTableOptions {
  includeUnknownFields?: boolean;
}

const DEFAULT_MISSING_TOKENS = ['MM'];

interface ParsedTableData {
  headers: string[];
  units: string[];
  rows: ParsedValue[][];
  rawRows: string[];
}

class SimpleDataFrame implements DataFrame {
  public readonly columns: string[];
  private readonly data: ParsedValue[][];
  private readonly columnIndex: Map<string, number>;

  constructor(columns: string[], rows: ParsedValue[][]) {
    this.columns = [...columns];
    this.data = rows.map(row => row.slice());
    this.columnIndex = new Map(this.columns.map((name, index) => [name, index]));
  }

  get height(): number {
    return this.data.length;
  }

  rows(): ParsedValue[][] {
    return this.data.map(row => row.slice());
  }

  getColumn(name: string): DataFrameColumn {
    const index = this.columnIndex.get(name);
    const values =
      index === undefined
        ? []
        : this.data.map(row => row[index] ?? null);
    return {
      name,
      toArray: () => values.slice(),
    };
  }
}

function resolveRowOptions(options: ParseRowOptions): Required<ParseRowOptions> {
  return {
    coerceNumbers: options.coerceNumbers ?? true,
    missingValue: options.missingValue ?? null,
    missingTokens: options.missingTokens ?? DEFAULT_MISSING_TOKENS,
  };
}

function isMissingToken(value: string, missingTokens: string[]): boolean {
  if (missingTokens.includes(value)) {
    return true;
  }

  // NDBC missing values are often 9s (e.g. 99, 999, 9999, 99.0).
  if (/^9{2,}(\.0+|\.9+)?$/.test(value)) {
    return true;
  }

  return false;
}

function coerceValue(
  raw: string,
  options: Required<ParseRowOptions>,
): ParsedValue {
  if (isMissingToken(raw, options.missingTokens)) {
    return options.missingValue;
  }

  if (options.coerceNumbers) {
    const numeric = Number(raw);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
  }

  return raw;
}

export function parseRow(
  rawRow: string,
  options: ParseRowOptions = {},
): ParsedValue[] {
  const resolved = resolveRowOptions(options);

  return rawRow
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(value => coerceValue(value, resolved));
}

function isCommentLine(line: string, commentPrefix: string): boolean {
  return line.startsWith(`${commentPrefix} `);
}

function normalizeLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

function normalizeRowLength(
  headers: string[],
  row: ParsedValue[],
  missingValue: ParsedValue,
): ParsedValue[] {
  const normalized = row.slice(0, headers.length);
  while (normalized.length < headers.length) {
    normalized.push(missingValue);
  }
  return normalized;
}

function parseDataRows(
  headers: string[],
  rawRows: string[],
  rowOptions: Required<ParseRowOptions>,
): ParsedValue[][] {
  return rawRows.map(row =>
    normalizeRowLength(headers, parseRow(row, rowOptions), rowOptions.missingValue),
  );
}

function createFrameFromRows(headers: string[], rows: ParsedValue[][]): DataFrame {
  return new SimpleDataFrame(headers, rows);
}

function parseRealtimeTableData(
  rawText: string,
  options: ParseRealtimeTableOptions,
): ParsedTableData {
  const commentPrefix = options.commentPrefix ?? '#';
  const lines = normalizeLines(rawText).filter(
    line => !isCommentLine(line, commentPrefix),
  );

  if (lines.length === 0) {
    return { headers: [], units: [], rows: [], rawRows: [] };
  }

  const headerLine = lines[0] ?? '';
  const headerOptions: ParseRowOptions = {
    coerceNumbers: false,
    missingValue: null,
    missingTokens: [],
  };
  const headers = parseRow(headerLine, headerOptions).map(String);

  let units: string[] = [];
  let dataStartIndex = 1;

  const unitLine = lines[1];
  if (unitLine && unitLine.startsWith(commentPrefix)) {
    units = parseRow(unitLine, headerOptions).map(token => {
      const text = String(token);
      return text.startsWith(commentPrefix)
        ? text.slice(commentPrefix.length)
        : text;
    });
    dataStartIndex = 2;
  }

  const rowOptions = resolveRowOptions({
    coerceNumbers: options.coerceNumbers,
    missingValue: options.missingValue,
    missingTokens: options.missingTokens,
  });

  const rawRows = lines.slice(dataStartIndex);
  const rows = parseDataRows(headers, rawRows, rowOptions);

  return {
    headers,
    units,
    rows,
    rawRows,
  };
}

export function parseRealtimeTable(
  rawText: string,
  options: ParseRealtimeTableOptions = {},
): RealtimeTable {
  const parsed = parseRealtimeTableData(rawText, options);
  return {
    headers: parsed.headers,
    units: parsed.units,
    rows: parsed.rows,
    rawRows: parsed.rawRows,
  };
}

export function parseRealtimeTableFrame(
  rawText: string,
  options: ParseRealtimeTableOptions = {},
): RealtimeTableFrame {
  const parsed = parseRealtimeTableData(rawText, options);
  const frame = createFrameFromRows(parsed.headers, parsed.rows);
  return {
    headers: parsed.headers,
    units: parsed.units,
    frame,
    rawRows: parsed.rawRows,
  };
}

export function toDataFrame(table: RealtimeTable): DataFrame {
  return createFrameFromRows(table.headers, table.rows);
}

export function objectifyTable(table: RealtimeTable): RealtimeRecord[] {
  const { headers, rows } = table;
  return rows.map(row => {
    const record: RealtimeRecord = {};
    headers.forEach((header, index) => {
      record[header] = row[index] ?? null;
    });
    return record;
  });
}

export function createMeasurement(): Measurement {
  return {
    airTemperature: Number.NaN,
    day: Number.NaN,
    dewpointTemperature: Number.NaN,
    hour: Number.NaN,
    minute: Number.NaN,
    month: Number.NaN,
    pressureTendancy: Number.NaN,
    seaLevelPressure: Number.NaN,
    stationVisibility: Number.NaN,
    water: {
      averagePeriod: Number.NaN,
      dominantDirection: Number.NaN,
      dominantPeriod: Number.NaN,
      significantHeight: Number.NaN,
      surfaceTemperature: Number.NaN,
      tide: Number.NaN,
    },
    wind: {
      averageSpeed: Number.NaN,
      direction: Number.NaN,
      peakGustSpeed: Number.NaN,
    },
    year: Number.NaN,
  };
}

const FIELD_MAPPINGS: Record<string, (m: Measurement, value: ParsedValue) => void> = {
  '#YY': (m, value) => {
    m.year = Number(value);
  },
  YY: (m, value) => {
    m.year = Number(value);
  },
  MM: (m, value) => {
    m.month = Number(value);
  },
  DD: (m, value) => {
    m.day = Number(value);
  },
  hh: (m, value) => {
    m.hour = Number(value);
  },
  mm: (m, value) => {
    m.minute = Number(value);
  },
  APD: (m, value) => {
    m.water.averagePeriod = Number(value);
  },
  ATMP: (m, value) => {
    m.airTemperature = Number(value);
  },
  DEWP: (m, value) => {
    m.dewpointTemperature = Number(value);
  },
  DPD: (m, value) => {
    m.water.dominantPeriod = Number(value);
  },
  GST: (m, value) => {
    m.wind.peakGustSpeed = Number(value);
  },
  MWD: (m, value) => {
    m.water.dominantDirection = Number(value);
  },
  PRES: (m, value) => {
    m.seaLevelPressure = Number(value);
  },
  PTDY: (m, value) => {
    m.pressureTendancy = Number(value);
  },
  TIDE: (m, value) => {
    m.water.tide = Number(value);
  },
  VIS: (m, value) => {
    m.stationVisibility = Number(value);
  },
  WDIR: (m, value) => {
    m.wind.direction = Number(value);
  },
  WSPD: (m, value) => {
    m.wind.averageSpeed = Number(value);
  },
  WTMP: (m, value) => {
    m.water.surfaceTemperature = Number(value);
  },
  WVHT: (m, value) => {
    m.water.significantHeight = Number(value);
  },
};

export function parseRealtimeData(
  buoyId: string,
  rawText: string,
  options: ParseRealtimeDataOptions = {},
): BuoyData {
  const parsed = parseRealtimeTableData(rawText, {
    ...options,
    missingValue: options.missingValue ?? Number.NaN,
  });
  const frame = createFrameFromRows(parsed.headers, parsed.rows);
  const rowCount = frame.height;
  const measurements = Array.from({ length: rowCount }, () =>
    createMeasurement(),
  );
  const columns = frame.columns;

  Object.entries(FIELD_MAPPINGS).forEach(([field, mapper]) => {
    if (!columns.includes(field)) {
      return;
    }
    const values = frame.getColumn(field).toArray() as ParsedValue[];
    values.forEach((value, index) => {
      const measurement = measurements[index];
      if (!measurement) {
        return;
      }
      mapper(measurement, value);
    });
  });

  if (options.includeUnknownFields) {
    const measurementsWithUnknowns = measurements.map((measurement, index) => {
      const enriched = measurement as Measurement & RealtimeRecord;
      parsed.headers.forEach((column, columnIndex) => {
        enriched[column] = parsed.rows[index]?.[columnIndex] ?? null;
      });
      return enriched;
    });

    return {
      id: buoyId,
      measurements: measurementsWithUnknowns,
    };
  }

  return {
    id: buoyId,
    measurements,
  };
}
