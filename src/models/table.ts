import type { DataFrame } from 'nodejs-polars';

export type ParsedValue = string | number | null;

export interface RealtimeTable {
  headers: string[];
  units: string[];
  rows: ParsedValue[][];
  rawRows: string[];
}

export interface RealtimeTableFrame {
  headers: string[];
  units: string[];
  frame: DataFrame;
  rawRows: string[];
}

export type RealtimeRecord = Record<string, ParsedValue>;
