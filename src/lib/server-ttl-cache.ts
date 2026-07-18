type CacheEntry<T> = {
  value: T
  expiresAt: number
}

const stores = new Map<string, Map<string, CacheEntry<unknown>>>()
/** In-flight loaders — prevents stampede when many requests miss TTL together. */
const inflight = new Map<string, Promise<unknown>>()

function getStore(namespace: string): Map<string, CacheEntry<unknown>> {
  let store = stores.get(namespace)
  if (!store) {
    store = new Map()
    stores.set(namespace, store)
  }
  return store
}

function inflightKey(namespace: string, key: string): string {
  return `${namespace}::${key}`
}

/** In-process TTL cache for read-heavy server data (categories, site access, etc.). */
export async function getCachedValue<T>(
  namespace: string,
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const store = getStore(namespace)
  const now = Date.now()
  const hit = store.get(key)
  if (hit && hit.expiresAt > now) {
    return hit.value as T
  }

  const pendingKey = inflightKey(namespace, key)
  const existing = inflight.get(pendingKey)
  if (existing) {
    return existing as Promise<T>
  }

  const pending = (async () => {
    try {
      const value = await loader()
      store.set(key, { value, expiresAt: Date.now() + ttlMs })
      return value
    } finally {
      inflight.delete(pendingKey)
    }
  })()

  inflight.set(pendingKey, pending)
  return pending
}

export function invalidateCachedNamespace(namespace: string): void {
  stores.delete(namespace)
  for (const key of Array.from(inflight.keys())) {
    if (key.startsWith(`${namespace}::`)) inflight.delete(key)
  }
}

export function invalidateCachedKey(namespace: string, key: string): void {
  getStore(namespace).delete(key)
  inflight.delete(inflightKey(namespace, key))
}

/** Return a warm cache entry without running the loader (undefined if missing or expired). */
export function peekCachedValue<T>(namespace: string, key: string): T | undefined {
  const hit = getStore(namespace).get(key)
  if (!hit || hit.expiresAt <= Date.now()) return undefined
  return hit.value as T
}
