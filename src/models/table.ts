export type ParsedValue = string | number | null;

export interface DataFrameColumn {
  name: string;
  toArray(): ParsedValue[];
}

export interface DataFrame {
  columns: string[];
  height: number;
  rows(): ParsedValue[][];
  getColumn(name: string): DataFrameColumn;
}

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
