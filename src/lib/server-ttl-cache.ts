type CacheEntry<T> = {
  value: T
  expiresAt: number
}

const stores = new Map<string, Map<string, CacheEntry<unknown>>>()

function getStore(namespace: string): Map<string, CacheEntry<unknown>> {
  let store = stores.get(namespace)
  if (!store) {
    store = new Map()
    stores.set(namespace, store)
  }
  return store
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

  const value = await loader()
  store.set(key, { value, expiresAt: now + ttlMs })
  return value
}

export function invalidateCachedNamespace(namespace: string): void {
  stores.delete(namespace)
}

export function invalidateCachedKey(namespace: string, key: string): void {
  getStore(namespace).delete(key)
}
