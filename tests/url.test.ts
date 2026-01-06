import { describe, expect, it } from 'vitest';
import { buildURL, formatQueryParams } from '../src/utils/url';

describe('url utilities', () => {
  it('formats query params with arrays and skips nulls', () => {
    expect(
      formatQueryParams({
        buoy: '46026',
        type: 'txt',
        include: ['a', 'b'],
        empty: null,
      }),
    ).toBe('?buoy=46026&type=txt&include=a&include=b');
  });

  it('builds a URL with query params', () => {
    const url = buildURL('https://example.com/api', 'data', {
      buoy: 46026,
    });
    expect(url).toBe('https://example.com/api/data?buoy=46026');
  });
});
