import { describe, expect, it, vi } from 'vitest';
import { buildRealtimeUrl, fetchRealtimeData } from '../src/realtime/fetch';

describe('fetchRealtimeData', () => {
  it('builds the expected URL', () => {
    const url = buildRealtimeUrl('46026', 'txt', 'https://example.com/');
    expect(url).toBe('https://example.com/46026.txt');
  });

  it('returns response text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'payload',
    });

    const result = await fetchRealtimeData({
      buoyId: '46026',
      type: 'txt',
      fetch: fetchMock,
      baseUrl: 'https://example.com/',
    });

    expect(result).toBe('payload');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/46026.txt',
      undefined,
    );
  });

  it('throws on a non-ok response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'error',
    });

    await expect(
      fetchRealtimeData({
        buoyId: '46026',
        fetch: fetchMock,
        baseUrl: 'https://example.com/error/',
      }),
    ).rejects.toThrow('Failed to fetch https://example.com/error/46026.txt: 500');
  });
});
