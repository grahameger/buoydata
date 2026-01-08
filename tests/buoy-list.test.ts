import { describe, expect, it, vi } from 'vitest';
import { fetchBuoyList } from '../src/stations/list';

describe('fetchBuoyList', () => {
  it('returns parsed station ids', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '# header\nSTATION LAT LON\n46026 45 -122\n46086 42 -125\n',
    });

    const result = await fetchBuoyList({
      fetch: fetchMock,
      url: 'https://example.com/stations.txt',
    });

    expect(result).toEqual(['46026', '46086']);
  });

  it('caches the list for repeat calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '41001 27 -90\n',
    });

    await fetchBuoyList({
      fetch: fetchMock,
      url: 'https://example.com/stations-cache.txt',
    });

    await fetchBuoyList({
      fetch: fetchMock,
      url: 'https://example.com/stations-cache.txt',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
