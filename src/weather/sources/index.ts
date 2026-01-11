import type { GribRequest } from '../types';
import { buildEcmwfUrl, type EcmwfSourceConfig } from './ecmwf';
import { buildGfsUrl, type GfsSourceConfig } from './gfs';
import { buildHrrrUrl, type HrrrSourceConfig } from './hrrr';
import { buildNamUrl, type NamSourceConfig } from './nam';

export type {
  EcmwfSourceConfig,
  GfsSourceConfig,
  HrrrSourceConfig,
  NamSourceConfig,
};

export interface WeatherSourceConfig {
  hrrr?: HrrrSourceConfig;
  nam?: NamSourceConfig;
  gfs?: GfsSourceConfig;
  ecmwf?: EcmwfSourceConfig;
}

export function buildGribUrl(
  request: GribRequest,
  config: WeatherSourceConfig = {},
): string {
  switch (request.model) {
    case 'hrrr':
      return buildHrrrUrl(request, config.hrrr);
    case 'nam':
      return buildNamUrl(request, config.nam);
    case 'gfs':
      return buildGfsUrl(request, config.gfs);
    case 'ecmwf':
      return buildEcmwfUrl(request, config.ecmwf);
    default:
      throw new Error(`Unsupported model: ${request.model}`);
  }
}

export { buildEcmwfUrl } from './ecmwf';
export { buildGfsUrl } from './gfs';
export { buildHrrrUrl } from './hrrr';
export { buildNamUrl } from './nam';
