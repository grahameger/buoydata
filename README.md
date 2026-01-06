# buoydata

https://www.npmjs.com/package/buoydata

Modern TypeScript SDK for NOAA NDBC realtime buoy data. The library provides a fetch layer, parsing helpers, and typed models for standard meteorological measurements while still supporting arbitrary realtime2 data types.

## Installation

```bash
pnpm add buoydata
```

## Quickstart

```ts
import {
  fetchRealtimeData,
  parseRealtimeData,
  parseRealtimeTable,
} from 'buoydata';

const raw = await fetchRealtimeData({ buoyId: '46026', type: 'txt' });
const data = parseRealtimeData('46026', raw);

console.log(data.measurements[0].wind.averageSpeed);

const table = parseRealtimeTable(raw);
console.log(table.headers);
```

## Browser usage

```ts
import { fetchRealtimeData, parseRealtimeTable } from 'buoydata';

const raw = await fetchRealtimeData({ buoyId: '46026', type: 'spec' });
const table = parseRealtimeTable(raw);
```

## Node usage

Node 18+ includes `fetch` globally. If you need a custom client, pass it explicitly:

```ts
import { fetchRealtimeData } from 'buoydata';
import fetch from 'node-fetch';

const raw = await fetchRealtimeData({ buoyId: '46026', fetch });
```

## API

### fetchRealtimeData

Fetches realtime2 files from NDBC.

```ts
fetchRealtimeData({
  buoyId: string,
  type?: string,
  fetch?: typeof fetch,
  requestInit?: RequestInit,
  baseUrl?: string,
}): Promise<string>
```

### buildRealtimeUrl

Builds the realtime2 URL for a buoy and file type.

```ts
buildRealtimeUrl(buoyId: string, type?: string, baseUrl?: string): string
```

### parseRealtimeData

Parses a realtime2 text file into typed `Measurement` objects. Standard fields are mapped into structured measurement fields. Unknown columns are ignored unless `includeUnknownFields` is enabled.

```ts
parseRealtimeData(
  buoyId: string,
  rawText: string,
  options?: {
    coerceNumbers?: boolean;
    missingValue?: number | null;
    missingTokens?: string[];
    commentPrefix?: string;
    includeUnknownFields?: boolean;
  },
): BuoyData
```

### parseRealtimeTable

Parses a realtime2 text file into a generic table representation with headers, units, and raw rows.

```ts
parseRealtimeTable(
  rawText: string,
  options?: {
    coerceNumbers?: boolean;
    missingValue?: number | null;
    missingTokens?: string[];
    commentPrefix?: string;
  },
): RealtimeTable
```

### parseRow

Parses a single row into values using whitespace splitting and missing-data handling.

```ts
parseRow(
  rawRow: string,
  options?: {
    coerceNumbers?: boolean;
    missingValue?: number | null;
    missingTokens?: string[];
  },
): ParsedValue[]
```

### objectifyTable

Converts a `RealtimeTable` into an array of records keyed by header values.

```ts
objectifyTable(table: RealtimeTable): RealtimeRecord[]
```

### getMeasurementDate

Creates a UTC `Date` instance from a `Measurement` (using year, month, day, hour, minute).

```ts
getMeasurementDate(measurement: Measurement): Date
```

### URL utilities

```ts
formatQueryParams(params: QueryParams): string
buildURL(base: string, path?: string, params?: QueryParams): string
```

## Data models

### Measurement

Structured representation of standard meteorological data:

- `year`, `month`, `day`, `hour`, `minute`
- `airTemperature`, `dewpointTemperature`
- `pressureTendancy`, `seaLevelPressure`, `stationVisibility`
- `wind` (`direction`, `averageSpeed`, `peakGustSpeed`)
- `water` (`averagePeriod`, `dominantDirection`, `dominantPeriod`, `significantHeight`, `surfaceTemperature`, `tide`)

### BuoyData

```ts
{
  id: string;
  measurements: Measurement[];
}
```

### RealtimeTable

```ts
{
  headers: string[];
  units: string[];
  rows: (string | number | null)[][];
  rawRows: string[];
}
```

### RealtimeRecord

```ts
Record<string, string | number | null>
```

## Parsing behavior

- Comment lines start with `# ` and are ignored for table parsing.
- The units row (typically `#yr mo dy ...`) is parsed into `units`.
- Missing data tokens default to `MM` and numeric 9s (e.g. `99`, `999`, `9999`, `99.0`).
- `parseRealtimeTable` uses `null` as the default missing value; `parseRealtimeData` uses `NaN` by default to align with numeric measurement fields.
- Numbers are coerced automatically unless `coerceNumbers` is set to `false`.

## Code layout

```
src/
  index.ts                Public exports
  models/
    measurement.ts        Typed data models for standard met data
    table.ts              Generic table and record types
  realtime/
    fetch.ts              Fetch layer and realtime URL builder
    parser.ts             Table parsing, objectification, and measurement mapping
  utils/
    date.ts               Measurement date helper
    url.ts                URL and query param utilities

tests/
  fixtures/               Downloaded realtime2 sample files
  parser.test.ts          Parsing tests across formats
  fetch.test.ts           Fetch layer tests (mocked)
  url.test.ts             URL/query param tests
  date.test.ts            Measurement date utility test
```

## Architecture diagrams

### High-level flow

```
                +----------------------+
                |   NDBC realtime2     |
                |  (https endpoint)    |
                +----------+-----------+
                           |
                           | fetchRealtimeData
                           v
                    +------+------+
                    | rawText     |
                    +------+------+
                           |
           +---------------+----------------+
           |                                |
           v                                v
  parseRealtimeTable                 parseRealtimeData
           |                                |
           v                                v
   RealtimeTable                     BuoyData (typed)
           |
           v
    objectifyTable
           |
           v
    RealtimeRecord[]
```

### Parsing pipeline (parseRealtimeTable)

```
rawText
  |
  v
normalizeLines (trim, drop blanks)
  |
  v
filter comment lines ("# ")
  |
  v
parse header row  --> headers[]
  |
  v
parse units row   --> units[]
  |
  v
parse data rows   --> rows[][]
```

### Measurement mapping (parseRealtimeData)

```
RealtimeTable
  |
  v
objectifyTable -> RealtimeRecord[]
  |
  v
toMeasurement
  |
  v
Measurement[] (BuoyData.measurements)
```

## Testing

```bash
pnpm test
```

## License

MIT
