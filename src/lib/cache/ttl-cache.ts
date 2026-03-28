interface CacheEntry<V> {
  value: V;
  ts: number;
}

export interface TTLCache<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
  /** Update value without resetting TTL. Returns false if entry is absent or expired. */
  update(key: string, fn: (v: V) => V): boolean;
  delete(key: string): void;
}

export function createTTLCache<V>(ttl: number, maxSize = 500): TTLCache<V> {
  const cache = new Map<string, CacheEntry<V>>();

  function expired(entry: CacheEntry<V>): boolean {
    return Date.now() - entry.ts > ttl;
  }

  return {
    get(key) {
      const entry = cache.get(key);
      if (!entry) return undefined;
      if (expired(entry)) { cache.delete(key); return undefined; }
      return entry.value;
    },
    set(key, value) {
      if (cache.size >= maxSize && !cache.has(key)) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      cache.set(key, { value, ts: Date.now() });
    },
    update(key, fn) {
      const entry = cache.get(key);
      if (!entry || expired(entry)) return false;
      cache.set(key, { value: fn(entry.value), ts: entry.ts });
      return true;
    },
    delete(key) {
      cache.delete(key);
    },
  };
}
