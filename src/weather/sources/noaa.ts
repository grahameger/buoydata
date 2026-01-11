import type { GribRequest } from '../types';
import { buildURL } from '../../utils/url';
import {
  applyTemplate,
  joinPath,
  normalizeMirrorUrls,
  padNumber,
  selectRoundRobin,
} from '../utils';
import { buildNomadsFilterUrl } from './nomads';

export interface NomadsModelConfig {
  baseUrl?: string;
  baseUrls?: string[];
  dataBaseUrl?: string;
  dataBaseUrls?: string[];
  filterPath: string;
  dirTemplate: string;
  fileTemplate: string;
  forecastHourPad: number;
  useFilter?: boolean;
}

function resolveMirrorUrl(primary?: string, mirrors?: string[]): string {
  const urls = normalizeMirrorUrls(primary, mirrors);
  if (urls.length === 0) {
    throw new Error('No mirror URLs configured.');
  }
  return selectRoundRobin(urls);
}

function shouldUseFilter(request: GribRequest, config: NomadsModelConfig): boolean {
  if (config.useFilter !== undefined) {
    return config.useFilter;
  }
  return Boolean(
    request.region ||
      (request.variables && request.variables.length > 0) ||
      (request.levels && request.levels.length > 0),
  );
}

export function buildNomadsModelUrl(
  request: GribRequest,
  config: NomadsModelConfig,
): string {
  const hour = padNumber(request.run.hour, 2);
  const forecastHour = padNumber(request.forecastHour, config.forecastHourPad);
  const params = {
    date: request.run.date,
    hour,
    forecastHour,
    forecastHourRaw: String(request.forecastHour),
  };

  const file = applyTemplate(config.fileTemplate, params);
  const dir = applyTemplate(config.dirTemplate, params);

  if (shouldUseFilter(request, config)) {
    return buildNomadsFilterUrl({
      baseUrl: resolveMirrorUrl(config.baseUrl, config.baseUrls),
      filterPath: config.filterPath,
      file,
      dir,
      region: request.region,
      variables: request.variables,
      levels: request.levels,
    });
  }

  const path = joinPath(dir, file);
  return buildURL(
    resolveMirrorUrl(config.dataBaseUrl, config.dataBaseUrls),
    path,
  );
}
