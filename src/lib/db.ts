import mysql from 'mysql2/promise'
import { ensureEnvLoaded } from '@/lib/ensure-env'

const POOL_KEY = '__catalogusMysqlPool'
const POOL_RESET_KEY = '__catalogusMysqlPoolReset'

type GlobalDb = typeof globalThis & {
  [POOL_KEY]?: mysql.Pool
  [POOL_RESET_KEY]?: Promise<void>
}

const globalDb = globalThis as GlobalDb

function defaultConnectionLimit(): number {
  const fromEnv = Number(process.env.DB_CONNECTION_LIMIT)
  if (Number.isFinite(fromEnv) && fromEnv > 0) return Math.min(fromEnv, 30)
  return process.env.NODE_ENV === 'production' ? 15 : 4
}

/** Build mysql:// URL from DATABASE_URL or legacy DB_* variables */
export function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim()
  if (url) {
    if (!url.startsWith('mysql://') && !url.startsWith('mariadb://')) {
      throw new Error('DATABASE_URL must start with mysql:// or mariadb://')
    }
    return url.replace(/^mariadb:\/\//, 'mysql://')
  }

  const host = process.env.DB_HOST
  const user = process.env.DB_USER
  const password = process.env.DB_PASSWORD
  const database = process.env.DB_NAME
  const port = process.env.DB_PORT || '3306'

  if (!host || !user || !password || !database) {
    throw new Error(
      'Database not configured. Set DATABASE_URL or DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in .env'
    )
  }

  return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`
}

function createPool() {
  ensureEnvLoaded()
  const limit = defaultConnectionLimit()
  return mysql.createPool({
    uri: resolveDatabaseUrl(),
    waitForConnections: true,
    connectionLimit: limit,
    maxIdle: Math.min(limit, 4),
    queueLimit: 50,
    timezone: 'Z',
    decimalNumbers: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 15000,
    idleTimeout: 30_000,
  })
}

/** Close pool and clear global singleton (avoids duplicate pools on HMR / retries). */
export async function resetDbPool(): Promise<void> {
  if (globalDb[POOL_RESET_KEY]) {
    await globalDb[POOL_RESET_KEY]
    return
  }

  const existing = globalDb[POOL_KEY]
  if (!existing) return

  globalDb[POOL_RESET_KEY] = existing
    .end()
    .catch(() => {})
    .finally(() => {
      globalDb[POOL_KEY] = undefined
      globalDb[POOL_RESET_KEY] = undefined
    })

  await globalDb[POOL_RESET_KEY]
}

export function getDbPool(): mysql.Pool {
  if (!globalDb[POOL_KEY]) {
    globalDb[POOL_KEY] = createPool()
  }
  return globalDb[POOL_KEY]
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isDbTooManyConnections(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const code = (err as { code?: string }).code
  const errno = (err as { errno?: number }).errno
  const message = err instanceof Error ? err.message : ''
  return (
    code === 'ER_CON_COUNT_ERROR' ||
    errno === 1040 ||
    /too many connections/i.test(message)
  )
}

export function isDbConnectionError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  if (isDbTooManyConnections(err)) return true
  const code = (err as { code?: string }).code
  return (
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'PROTOCOL_CONNECTION_LOST' ||
    code === 'ER_BAD_DB_ERROR' ||
    code === 'ENOTFOUND' ||
    (err as { fatal?: boolean }).fatal === true
  )
}

function shouldResetPool(err: unknown): boolean {
  if (isDbTooManyConnections(err)) return false
  const message = err instanceof Error ? err.message : ''
  if (message.includes('Pool is closed')) return true
  return isDbConnectionError(err)
}

export async function queryDb<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [rows] = await getDbPool().query(sql, params)
      return rows as T
    } catch (err) {
      lastError = err

      if (isDbTooManyConnections(err) && attempt < 2) {
        await sleep(300 * (attempt + 1))
        continue
      }

      if (shouldResetPool(err) && attempt < 2) {
        await resetDbPool()
        continue
      }

      throw err
    }
  }

  throw lastError
}
