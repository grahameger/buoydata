import type { GribRequest } from '../types';
import { buildNomadsModelUrl, type NomadsModelConfig } from './noaa';

export interface HrrrSourceConfig extends Partial<NomadsModelConfig> {}

const DEFAULT_HRRR_CONFIG: NomadsModelConfig = {
  baseUrl: 'https://nomads.ncep.noaa.gov',
  dataBaseUrls: [
    'https://noaa-hrrr-bdp-pds.s3.amazonaws.com',
    'https://storage.googleapis.com/noaa-hrrr-bdp-pds',
  ],
  filterPath: '/cgi-bin/filter_hrrr_2d.pl',
  dirTemplate: 'hrrr.{date}/conus',
  fileTemplate: 'hrrr.t{hour}z.wrfsfcf{forecastHour}.grib2',
  forecastHourPad: 2,
};

export function buildHrrrUrl(
  request: GribRequest,
  config: HrrrSourceConfig = {},
): string {
  return buildNomadsModelUrl(request, { ...DEFAULT_HRRR_CONFIG, ...config });
}
