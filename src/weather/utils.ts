import { createHash } from 'crypto';
import type { GribRequest } from './types';

export function padNumber(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

export function formatRunDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = padNumber(date.getUTCMonth() + 1, 2);
  const day = padNumber(date.getUTCDate(), 2);
  return `${year}${month}${day}`;
}

export function applyTemplate(
  template: string,
  params: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    if (value === undefined) {
      throw new Error(`Missing template value for ${match}`);
    }
    return value;
  });
}

export function joinPath(...parts: string[]): string {
  return parts
    .map(part => part.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
}

export function ensureLeadingSlash(value: string): string {
  if (!value.startsWith('/')) {
    return `/${value}`;
  }
  return value;
}

interface RoundRobinState {
  order: string[];
  index: number;
}

const ROUND_ROBIN_STATE = new Map<string, RoundRobinState>();

function shuffleInPlace(values: string[]): void {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
}

export function selectRoundRobin(values: string[]): string {
  if (values.length === 0) {
    throw new Error('No mirror URLs available.');
  }

  const key = values.join('|');
  let state = ROUND_ROBIN_STATE.get(key);
  if (!state) {
    const order = [...values];
    shuffleInPlace(order);
    state = { order, index: 0 };
    ROUND_ROBIN_STATE.set(key, state);
  }

  const selection = state.order[state.index];
  state.index = (state.index + 1) % state.order.length;
  return selection;
}

export function resetRoundRobinState(): void {
  ROUND_ROBIN_STATE.clear();
}

export function normalizeMirrorUrls(
  primary?: string,
  mirrors?: string[],
): string[] {
  const list = [...(mirrors ?? [])];
  if (primary) {
    list.unshift(primary);
  }
  return list;
}

function normalizeList(values?: string[]): string[] {
  if (!values) {
    return [];
  }
  return values.map(value => value.trim()).filter(Boolean).sort();
}

function sanitizeVariant(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 32);
}

export function getRequestVariant(request: GribRequest): string | undefined {
  if (request.variant) {
    return sanitizeVariant(request.variant);
  }

  const hasFilters =
    request.region ||
    (request.variables && request.variables.length > 0) ||
    (request.levels && request.levels.length > 0);

  if (!hasFilters) {
    return undefined;
  }

  const payload = {
    region: request.region ?? null,
    variables: normalizeList(request.variables),
    levels: normalizeList(request.levels),
  };

  const hash = createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 12);

  return hash;
}
