import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

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
  const databaseUrl = resolveDatabaseUrl()

  return mysql.createPool({
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 5),
    queueLimit: 0,
    timezone: 'Z',
    decimalNumbers: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 20000,
    idleTimeout: 60000,
    maxIdle: 5,
  })
}

export function resetDbPool() {
  if (pool) {
    pool.end().catch(() => {})
    pool = null
  }
}

export function getDbPool() {
  if (!pool) pool = createPool()
  return pool
}

function isConnectionError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const code = (err as { code?: string }).code
  return (
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'PROTOCOL_CONNECTION_LOST' ||
    (err as { fatal?: boolean }).fatal === true
  )
}

export async function queryDb<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T> {
  try {
    const [rows] = await getDbPool().query(sql, params)
    return rows as T
  } catch (err) {
    if (isConnectionError(err)) {
      resetDbPool()
      const [rows] = await getDbPool().query(sql, params)
      return rows as T
    }
    throw err
  }
}
