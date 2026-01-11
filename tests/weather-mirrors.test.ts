import { describe, expect, it } from 'vitest';
import { resetRoundRobinState, selectRoundRobin } from '../src/weather/utils';

describe('mirror round robin', () => {
  it('rotates through each mirror before repeating', () => {
    resetRoundRobinState();
    const mirrors = ['https://a.example', 'https://b.example', 'https://c.example'];

    const first = selectRoundRobin(mirrors);
    const second = selectRoundRobin(mirrors);
    const third = selectRoundRobin(mirrors);
    const fourth = selectRoundRobin(mirrors);

    expect(new Set([first, second, third]).size).toBe(3);
    expect(fourth).toBe(first);
  });
});
