import { BuoyData, Measurement } from '../models/measurement';
import { ParsedValue, RealtimeRecord, RealtimeTable } from '../models/table';

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
  const resolved: Required<ParseRowOptions> = {
    coerceNumbers: options.coerceNumbers ?? true,
    missingValue: options.missingValue ?? null,
    missingTokens: options.missingTokens ?? DEFAULT_MISSING_TOKENS,
  };

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

export function parseRealtimeTable(
  rawText: string,
  options: ParseRealtimeTableOptions = {},
): RealtimeTable {
  const commentPrefix = options.commentPrefix ?? '#';
  const lines = normalizeLines(rawText).filter(
    line => !isCommentLine(line, commentPrefix),
  );

  if (lines.length === 0) {
    return { headers: [], units: [], rows: [], rawRows: [] };
  }

  const headerLine = lines[0];
  const headerOptions: ParseRowOptions = {
    coerceNumbers: false,
    missingValue: null,
    missingTokens: [],
  };
  const headers = parseRow(headerLine, headerOptions).map(String);

  let units: string[] = [];
  let dataStartIndex = 1;

  if (lines.length > 1 && lines[1].startsWith(commentPrefix)) {
    units = parseRow(lines[1], headerOptions).map(token =>
      token.startsWith(commentPrefix) ? token.slice(commentPrefix.length) : token,
    );
    dataStartIndex = 2;
  }

  const rowOptions: ParseRowOptions = {
    coerceNumbers: options.coerceNumbers,
    missingValue: options.missingValue,
    missingTokens: options.missingTokens,
  };

  const dataRows = lines.slice(dataStartIndex);
  const rows = dataRows.map(row => parseRow(row, rowOptions));

  return {
    headers,
    units,
    rows,
    rawRows: dataRows,
  };
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

function toMeasurement(record: RealtimeRecord): Measurement {
  const measurement = createMeasurement();
  Object.entries(record).forEach(([field, value]) => {
    const mapper = FIELD_MAPPINGS[field];
    if (mapper) {
      mapper(measurement, value);
    }
  });
  return measurement;
}

export function parseRealtimeData(
  buoyId: string,
  rawText: string,
  options: ParseRealtimeDataOptions = {},
): BuoyData {
  const table = parseRealtimeTable(rawText, {
    ...options,
    missingValue: options.missingValue ?? Number.NaN,
  });
  const records = objectifyTable(table);

  const measurements = records.map(record => toMeasurement(record));

  if (options.includeUnknownFields) {
    const measurementsWithUnknowns = measurements.map((measurement, index) => {
      const record = records[index];
      return { ...measurement, ...record } as Measurement;
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
