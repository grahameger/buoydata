# Context and Reference Notes

## Existing Libraries (Superset Targets)
- `existing_libs/ndbc-realtime-tojson`
  - Fetches `http://www.ndbc.noaa.gov/data/realtime2/{stationId}.{type}`.
  - Splits whitespace rows and converts header row to objects.
- `existing_libs/buoy-kit`
  - Parses realtime2 standard met data into typed measurements.
  - Provides `fetchBuoyRealTimeData` and URL utilities.

## NDBC Realtime Data Access (FAQ Notes)
- Realtime data lives under `https://www.ndbc.noaa.gov/data/realtime2/`.
- Preferred protocol is HTTPS.
- File naming: `{station_id}.{datatype}`.
- Data types include: `txt`, `drift`, `cwind`, `spec`, `data_spec`, `swdir`, `swdir2`, `swr1`, `swr2`, `adcp`, `ocean`, `tide`.
- C-MAN land stations use uppercase IDs (example: `FPSN7.txt`).
- Realtime files typically contain ~45 days of data.

## Header Rules / Format Notes
- Header and metadata lines start with `#`.
- A second header line lists units; raw spectral data does not have unit headers.
- Realtime missing values are `MM`.
- Historical files may use numeric 9s (e.g. `999.0`, `99.0`) for missing values.

## Standard Met Format (txt) Example
- Header:
  - `#YY  MM DD hh mm WDIR WSPD GST  WVHT   DPD   APD MWD   PRES  ATMP  WTMP  DEWP  VIS PTDY  TIDE`
- Units:
  - `#yr  mo dy hr mn degT m/s  m/s     m   sec   sec degT   hPa  degC  degC  degC  nmi  hPa    ft`
- Sample data:
  - `2014 09 11 16 50 120  5.0  6.0   0.6     6   4.2 134 1016.5  29.3  30.5  24.4   MM +0.3    MM`

## Other Data Types (Examples)
- `cwind`:
  - `#YY  MM DD hh mm WDIR WSPD GDR GST GTIME`
- `spec` (wave summary):
  - `#YY  MM DD hh mm WVHT  SwH  SwP  WWH  WWP SwD WWD  STEEPNESS  APD MWD`
- `drift`:
  - `#YY  MM DD hhmm     LAT      LON WDIR WSPD GST   PRES PTDY ATMP WTMP  DEWP  WVHT  DPD`
- `adcp`:
  - `#YY  MM DD hh mm DEP01 DIR01 SPD01 DEP02 DIR02 SPD02 ...`

## Timing Notes
- Most stations report hourly; data available ~25 minutes after the hour.
- Observation times are in UTC in realtime files.
- Acquisition periods differ by station type and payload; continuous winds provide end-of-acquisition time in record.

## Tips for Implementation
- Treat rows starting with `#` as metadata/comments, but parse the first two header lines when present.
- Support both whitespace-delimited parsing and direct table objectification.
- Provide a configuration option for missing value handling (e.g., `null` vs `NaN`).
- Keep parser extensible: allow registering per-datatype field maps.
