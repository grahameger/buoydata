# Buoy Data TypeScript Library Plan

## Goals
- Build a modern TypeScript SDK that supersets `ndbc-realtime-tojson` and `buoy-kit`.
- Use Vite library mode, strict TypeScript, and a clean ESM-first package.
- Include comprehensive tests for parsing, URL building, and fetch behavior.

## Scope
- Realtime file fetching from `https://www.ndbc.noaa.gov/data/realtime2/`.
- Parsing for realtime text formats and a generic table parser for arbitrary realtime2 data types.
- Typed data models for standard meteorological data and buoy measurements.
- Extensible parsing for additional NDBC realtime2 data types.

## Phases
1) Project setup
- Create new package directory (name TBD) with Vite library config.
- Add TypeScript strict config and path aliases if needed.
- Add ESLint + Prettier configs.
- Add Vitest with coverage enabled.
- Define build outputs: ESM + CJS + types.

2) Core API surface
- Implement fetch layer with configurable Fetch client and request options.
- Implement URL builder and query param utilities.
- Define public APIs:
  - `fetchRealtimeData({ buoyId, type })`
  - `parseRealtimeData(buoyId, rawText, options)`
  - `parseRealtimeTable(rawText)`
  - `parseRow(rawRow)`
  - `objectifyTable(table)`
  - `getMeasurementDate(measurement)`

3) Parsing + data models
- Build parsing pipeline:
  - split into rows
  - handle comment lines (#) and unit line (#yr ...)
  - parse headers + units
  - map data rows to objects
- Add typed models for standard met data (from buoy-kit).
- Add raw table parser to support non-standard data types (spec, drift, cwind, etc.).
- Support missing data handling ("MM" and 9s) with configurable behavior.

4) Tests
- Unit tests for URL utilities and query param formatting.
- Parsing tests:
  - standard met format (txt)
  - wave summary (spec)
  - continuous winds (cwind)
  - drift format
  - unknown fields
- Fetch tests with mocked Fetch for success/error paths.
- Snapshot tests for parsed measurements.

5) Documentation
- README with quickstart for browser + Node.
- Examples for structured parse and raw table parse.
- Notes on NDBC realtime data types and formats.

## Deliverables
- TypeScript source under `src/`.
- Vite-based build output under `dist/`.
- Test suite runnable with `vitest`.
- Documentation in README.

## Risks / Open Questions
- Handling of historical data formats vs realtime2.
- Whether to include built-in Fetch polyfill for Node.
- Final API naming and package name.
