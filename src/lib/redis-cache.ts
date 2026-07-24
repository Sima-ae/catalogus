/**
 * Optional shared cache via REDIS_URL. When unset, callers fall back to in-process TTL.
 * Keeps MariaDB stampedes down across Next.js workers / restarts.
 */
type RedisLike = {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ...args: Array<string | number>): Promise<unknown>
  del(...keys: string[]): Promise<unknown>
}

type GlobalRedis = typeof globalThis & {
  __catalogusRedis?: RedisLike | null
  __catalogusRedisPromise?: Promise<RedisLike | null>
}

function redisUrl(): string | null {
  const raw = process.env.REDIS_URL?.trim()
  return raw || null
}

export function isRedisCacheEnabled(): boolean {
  return Boolean(redisUrl())
}

async function connectRedis(): Promise<RedisLike | null> {
  const url = redisUrl()
  if (!url) return null

  try {
    const { default: Redis } = await import('ioredis')
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      connectTimeout: 1500,
      commandTimeout: 1500,
      lazyConnect: false,
    })
    client.on('error', (err: Error) => {
      console.warn('[redis-cache] connection error:', err.message)
    })
    return client as unknown as RedisLike
  } catch (err) {
    console.warn(
      '[redis-cache] unavailable — using in-process cache only:',
      err instanceof Error ? err.message : err
    )
    return null
  }
}

export async function getRedisClient(): Promise<RedisLike | null> {
  const g = globalThis as GlobalRedis
  if (g.__catalogusRedis !== undefined) return g.__catalogusRedis
  if (!g.__catalogusRedisPromise) {
    g.__catalogusRedisPromise = connectRedis().then((client) => {
      g.__catalogusRedis = client
      return client
    })
  }
  return g.__catalogusRedisPromise
}

export async function redisGetJson<T>(key: string): Promise<T | undefined> {
  const client = await getRedisClient()
  if (!client) return undefined
  try {
    const raw = await client.get(key)
    if (!raw) return undefined
    return JSON.parse(raw) as T
  } catch {
    return undefined
  }
}

export async function redisSetJson(
  key: string,
  value: unknown,
  ttlMs: number
): Promise<void> {
  const client = await getRedisClient()
  if (!client) return
  const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000))
  try {
    await client.set(key, JSON.stringify(value), 'EX', ttlSec)
  } catch {
    // Ignore — memory cache still holds the value.
  }
}

export async function redisDel(key: string): Promise<void> {
  const client = await getRedisClient()
  if (!client) return
  try {
    await client.del(key)
  } catch {
    /* ignore */
  }
}
