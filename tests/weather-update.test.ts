import { describe, expect, it } from 'vitest';
import { getModelUpdateStatus } from '../src/weather/update';

describe('weather update status', () => {
  it('calculates last and next update times using the delay', () => {
    const now = new Date(Date.UTC(2024, 0, 1, 10, 0, 0));
    const status = getModelUpdateStatus('gfs', now);

    expect(status.lastRun.toISOString()).toBe('2024-01-01T06:00:00.000Z');
    expect(status.lastUpdate.toISOString()).toBe('2024-01-01T09:00:00.000Z');
    expect(status.nextRun.toISOString()).toBe('2024-01-01T12:00:00.000Z');
    expect(status.nextUpdate.toISOString()).toBe('2024-01-01T15:00:00.000Z');
  });
});
