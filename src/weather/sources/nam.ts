import type { GribRequest } from '../types';
import { buildNomadsModelUrl, type NomadsModelConfig } from './noaa';

export interface NamSourceConfig extends Partial<NomadsModelConfig> {}

const DEFAULT_NAM_CONFIG: NomadsModelConfig = {
  baseUrl: 'https://nomads.ncep.noaa.gov',
  dataBaseUrls: [
    'https://noaa-nam-pds.s3.amazonaws.com',
    'https://storage.googleapis.com/noaa-nam-pds',
  ],
  filterPath: '/cgi-bin/filter_nam.pl',
  dirTemplate: 'nam.{date}',
  fileTemplate: 'nam.t{hour}z.awphys{forecastHour}.tm00.grib2',
  forecastHourPad: 2,
};

export function buildNamUrl(
  request: GribRequest,
  config: NamSourceConfig = {},
): string {
  return buildNomadsModelUrl(request, { ...DEFAULT_NAM_CONFIG, ...config });
}
