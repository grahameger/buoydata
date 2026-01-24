import { buildURL, type QueryParams } from '../../utils/url';
import type { BoundingBox } from '../types';
import { ensureLeadingSlash } from '../utils';

export interface NomadsFilterOptions {
  baseUrl: string;
  filterPath: string;
  dir: string;
  file: string;
  region?: BoundingBox;
  variables?: string[];
  levels?: string[];
}

function applyNoaaParamPrefix(prefix: 'var_' | 'lev_', value: string): string {
  if (value.startsWith(prefix)) {
    return value;
  }
  return `${prefix}${value}`;
}

export function buildNomadsFilterUrl(options: NomadsFilterOptions): string {
  const params: QueryParams = {
    file: options.file,
    dir: ensureLeadingSlash(options.dir),
  };

  if (options.region) {
    params['subregion'] = '';
    params['leftlon'] = options.region.west;
    params['rightlon'] = options.region.east;
    params['toplat'] = options.region.north;
    params['bottomlat'] = options.region.south;
  }

  options.variables?.forEach(variable => {
    params[applyNoaaParamPrefix('var_', variable)] = 'on';
  });

  options.levels?.forEach(level => {
    params[applyNoaaParamPrefix('lev_', level)] = 'on';
  });

  return buildURL(options.baseUrl, options.filterPath, params);
}
