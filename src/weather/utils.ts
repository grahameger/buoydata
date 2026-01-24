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
    const current = values[i]!;
    values[i] = values[j]!;
    values[j] = current;
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

  const selection = state.order[state.index]!;
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

function toUtf8Bytes(value: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value);
  }

  const bytes: number[] = [];
  for (let i = 0; i < value.length; i += 1) {
    let code = value.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      i += 1;
      const next = value.charCodeAt(i);
      const combined = 0x10000 + ((code & 0x3ff) << 10) + (next & 0x3ff);
      bytes.push(
        0xf0 | (combined >> 18),
        0x80 | ((combined >> 12) & 0x3f),
        0x80 | ((combined >> 6) & 0x3f),
        0x80 | (combined & 0x3f),
      );
    }
  }

  return Uint8Array.from(bytes);
}

function sha256Hex(value: string): string {
  const K = [
    0x428a2f98,
    0x71374491,
    0xb5c0fbcf,
    0xe9b5dba5,
    0x3956c25b,
    0x59f111f1,
    0x923f82a4,
    0xab1c5ed5,
    0xd807aa98,
    0x12835b01,
    0x243185be,
    0x550c7dc3,
    0x72be5d74,
    0x80deb1fe,
    0x9bdc06a7,
    0xc19bf174,
    0xe49b69c1,
    0xefbe4786,
    0x0fc19dc6,
    0x240ca1cc,
    0x2de92c6f,
    0x4a7484aa,
    0x5cb0a9dc,
    0x76f988da,
    0x983e5152,
    0xa831c66d,
    0xb00327c8,
    0xbf597fc7,
    0xc6e00bf3,
    0xd5a79147,
    0x06ca6351,
    0x14292967,
    0x27b70a85,
    0x2e1b2138,
    0x4d2c6dfc,
    0x53380d13,
    0x650a7354,
    0x766a0abb,
    0x81c2c92e,
    0x92722c85,
    0xa2bfe8a1,
    0xa81a664b,
    0xc24b8b70,
    0xc76c51a3,
    0xd192e819,
    0xd6990624,
    0xf40e3585,
    0x106aa070,
    0x19a4c116,
    0x1e376c08,
    0x2748774c,
    0x34b0bcb5,
    0x391c0cb3,
    0x4ed8aa4a,
    0x5b9cca4f,
    0x682e6ff3,
    0x748f82ee,
    0x78a5636f,
    0x84c87814,
    0x8cc70208,
    0x90befffa,
    0xa4506ceb,
    0xbef9a3f7,
    0xc67178f2,
  ];

  const bytes = toUtf8Bytes(value);
  const bitLength = bytes.length * 8;
  const paddedLength = ((bytes.length + 9 + 63) >> 6) << 6;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  const rotr = (value: number, shift: number) =>
    (value >>> shift) | (value << (32 - shift));

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const w15 = w[i - 15] ?? 0;
      const w2 = w[i - 2] ?? 0;
      const w16 = w[i - 16] ?? 0;
      const w7 = w[i - 7] ?? 0;
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      w[i] = (w16 + s0 + w7 + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const k = K[i] ?? 0;
      const wi = w[i] ?? 0;
      const temp1 = (h + s1 + ch + k + wi) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const toHex = (value: number) => value.toString(16).padStart(8, '0');
  return (
    toHex(h0) +
    toHex(h1) +
    toHex(h2) +
    toHex(h3) +
    toHex(h4) +
    toHex(h5) +
    toHex(h6) +
    toHex(h7)
  );
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

  const hash = sha256Hex(JSON.stringify(payload)).slice(0, 12);

  return hash;
}
