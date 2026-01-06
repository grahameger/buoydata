export type ParsedValue = string | number | null;

export interface RealtimeTable {
  headers: string[];
  units: string[];
  rows: ParsedValue[][];
  rawRows: string[];
}

export type RealtimeRecord = Record<string, ParsedValue>;
