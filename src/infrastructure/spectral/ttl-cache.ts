export interface TtlCacheOptions {
  /** Max entries; oldest by insertion order are dropped. Default 64. */
  maxEntries?: number;
}

interface Entry<T> {
  expiresAtMs: number;
  value: T;
}

/** Simple in-memory TTL cache (process-local; fine for Next.js warm isolates). */
export class TtlCache<T> {
  private readonly store = new Map<string, Entry<T>>();
  private readonly maxEntries: number;

  constructor(options: TtlCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 64;
  }

  get(key: string, nowMs = Date.now()): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAtMs <= nowMs) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number, nowMs = Date.now()): void {
    if (ttlMs <= 0) return;
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) {
        this.store.delete(oldest);
      }
    }
    this.store.set(key, { value, expiresAtMs: nowMs + ttlMs });
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
