import { describe, expect, it, vi } from 'vitest';
import { fetchBuoyList, fetchStationIndex } from '../src/stations/list';

describe('fetchBuoyList', () => {
  it('returns parsed active station ids from XML', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        '<?xml version="1.0"?><stations><station id="46026"/><station id="chii2"/></stations>',
    });

    const result = await fetchBuoyList({
      fetch: fetchMock,
      activeUrl: 'https://example.com/active-1.xml',
    });

    expect(result).toEqual(['46026', 'CHII2']);
  });

  it('caches active lists for repeat calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '<stations><station id="41001"/></stations>',
    });

    await fetchBuoyList({
      fetch: fetchMock,
      activeUrl: 'https://example.com/active-cache.xml',
    });

    await fetchBuoyList({
      fetch: fetchMock,
      activeUrl: 'https://example.com/active-cache.xml',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns inactive stations when requested', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<stations><station id="46026"/></stations>',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '# header\n46026|OWNER\n99999|OWNER\n',
      });

    const result = await fetchBuoyList({
      fetch: fetchMock,
      activeUrl: 'https://example.com/active-include.xml',
      stationTableUrl: 'https://example.com/table.txt',
      includeInactive: true,
    });

    expect(result).toEqual(['46026', '99999']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('fetchStationIndex', () => {
  it('provides an isActive helper backed by a set', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '<stations><station id="BOSN4"/></stations>',
    });

    const index = await fetchStationIndex({
      fetch: fetchMock,
      activeUrl: 'https://example.com/active-is-active.xml',
    });

    expect(index.isActive('bosn4')).toBe(true);
    expect(index.isActive('41001')).toBe(false);
  });
});
