import { buildURL, type QueryParams } from '../../utils/url';
import type { GribRequest } from '../types';
import {
  applyTemplate,
  joinPath,
  normalizeMirrorUrls,
  padNumber,
  selectRoundRobin,
} from '../utils';

export type EcmwfProvider = 'ecmwf-open-data' | 'meteoblue';

export interface EcmwfSourceConfig {
  provider?: EcmwfProvider;
  baseUrl?: string;
  baseUrls?: string[];
  pathTemplate?: string;
  fileTemplate?: string;
  forecastHourPad?: number;
  query?: QueryParams;
  apiKey?: string;
  apiKeyParam?: string;
}

const DEFAULT_ECMWF_OPEN_DATA_BASE_URL = 'https://data.ecmwf.int/forecasts/';

function resolveMirrorUrl(config: EcmwfSourceConfig, fallback?: string): string {
  const baseUrl = config.baseUrl ?? fallback;
  const urls = normalizeMirrorUrls(baseUrl, config.baseUrls);
  if (urls.length === 0) {
    throw new Error('No ECMWF mirror URLs configured.');
  }
  return selectRoundRobin(urls);
}

function buildEcmwfOpenDataUrl(
  request: GribRequest,
  config: EcmwfSourceConfig,
): string {
  if (!config.pathTemplate || !config.fileTemplate) {
    throw new Error(
      'ECMWF open data requires pathTemplate and fileTemplate in the config.',
    );
  }

  const hour = padNumber(request.run.hour, 2);
  const forecastHour = padNumber(
    request.forecastHour,
    config.forecastHourPad ?? 3,
  );

  const params = {
    date: request.run.date,
    hour,
    forecastHour,
    forecastHourRaw: String(request.forecastHour),
  };

  const baseUrl = resolveMirrorUrl(config, DEFAULT_ECMWF_OPEN_DATA_BASE_URL);
  const path = joinPath(
    applyTemplate(config.pathTemplate, params),
    applyTemplate(config.fileTemplate, params),
  );

  return buildURL(baseUrl, path);
}

function buildMeteoblueUrl(
  request: GribRequest,
  config: EcmwfSourceConfig,
): string {
  if (!config.apiKey) {
    throw new Error('Meteoblue provider requires apiKey in the config.');
  }

  const hour = padNumber(request.run.hour, 2);
  const forecastHour = padNumber(
    request.forecastHour,
    config.forecastHourPad ?? 3,
  );

  const params = {
    date: request.run.date,
    hour,
    forecastHour,
    forecastHourRaw: String(request.forecastHour),
  };

  const path = config.pathTemplate
    ? applyTemplate(config.pathTemplate, params)
    : '';

  const query = {
    ...(config.query ?? {}),
    [config.apiKeyParam ?? 'apikey']: config.apiKey,
  };

  return buildURL(resolveMirrorUrl(config), path, query);
}

export function buildEcmwfUrl(
  request: GribRequest,
  config: EcmwfSourceConfig = {},
): string {
  const provider = config.provider ?? 'ecmwf-open-data';

  if (provider === 'meteoblue') {
    return buildMeteoblueUrl(request, config);
  }

  return buildEcmwfOpenDataUrl(request, config);
}
