export class LruCache<K, V> {
  private readonly items = new Map<K, { value: V; expiresAt: number }>();

  constructor(
    private readonly maxSize: number,
    private readonly ttlMs: number,
  ) {}

  get(key: K): V | undefined {
    const entry = this.items.get(key);
    if (!entry) {
      return undefined;
    }

    const now = Date.now();
    if (entry.expiresAt <= now) {
      this.items.delete(key);
      return undefined;
    }

    this.items.delete(key);
    this.items.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    const now = Date.now();
    if (this.items.has(key)) {
      this.items.delete(key);
    }

    this.items.set(key, { value, expiresAt: now + this.ttlMs });
    this.prune(now);
  }

  private prune(now: number): void {
    for (const [key, entry] of this.items) {
      if (entry.expiresAt > now) {
        continue;
      }
      this.items.delete(key);
    }

    while (this.items.size > this.maxSize) {
      const oldestKey = this.items.keys().next().value as K | undefined;
      if (oldestKey === undefined) {
        break;
      }
      this.items.delete(oldestKey);
    }
  }
}
