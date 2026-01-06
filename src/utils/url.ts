export type QueryParamValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>;

export type QueryParams = Record<string, QueryParamValue>;

export function formatQueryParams(params: QueryParams = {}): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach(item => {
        searchParams.append(key, String(item));
      });
      continue;
    }

    searchParams.append(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export function buildURL(
  base: string,
  path = '',
  params: QueryParams = {},
): string {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const url = new URL(path, normalizedBase);
  const query = formatQueryParams(params);
  url.search = query;
  return url.toString();
}
