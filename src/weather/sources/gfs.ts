import type { GribRequest } from '../types';
import { buildNomadsModelUrl, type NomadsModelConfig } from './noaa';

export interface GfsSourceConfig extends Partial<NomadsModelConfig> {}

const DEFAULT_GFS_CONFIG: NomadsModelConfig = {
  baseUrl: 'https://nomads.ncep.noaa.gov',
  dataBaseUrls: [
    'https://noaa-gfs-bdp-pds.s3.amazonaws.com',
    'https://storage.googleapis.com/noaa-gfs-bdp-pds',
  ],
  filterPath: '/cgi-bin/filter_gfs_0p25.pl',
  dirTemplate: 'gfs.{date}/{hour}/atmos',
  fileTemplate: 'gfs.t{hour}z.pgrb2.0p25.f{forecastHour}',
  forecastHourPad: 3,
};

export function buildGfsUrl(
  request: GribRequest,
  config: GfsSourceConfig = {},
): string {
  return buildNomadsModelUrl(request, { ...DEFAULT_GFS_CONFIG, ...config });
}
