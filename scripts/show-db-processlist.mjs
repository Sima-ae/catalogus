#!/usr/bin/env node
/**
 * Inspect MariaDB threads for this app's database (no tsx required).
 *   node scripts/show-db-processlist.mjs
 */
import fs from 'node:fs'
import mysql from 'mysql2/promise'

function loadEnv() {
  const path = new URL('../.env', import.meta.url)
  const raw = fs.readFileSync(path, 'utf8')
  return Object.fromEntries(
    raw
      .split('\n')
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
      })
  )
}

function resolveDatabaseUrl(env) {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL.replace(/^mariadb:\/\//, 'mysql://')
  }
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT = '3306' } = env
  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    throw new Error('Set DATABASE_URL or DB_* in .env')
  }
  return `mysql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${encodeURIComponent(DB_NAME)}`
}

function dbNameFromUrl(url) {
  try {
    return new URL(url).pathname.replace(/^\//, '') || 'supe_r_clones_cloud'
  } catch {
    return 'supe_r_clones_cloud'
  }
}

const HEAVY = /copying to tmp table|sorting result|waiting for table lock|creating sort index|sending data|locked/i

const env = loadEnv()
const url = resolveDatabaseUrl(env)
const dbName = env.DB_NAME || dbNameFromUrl(url)
const conn = await mysql.createConnection({ uri: url, connectTimeout: 10000 })

try {
  const [threads] = await conn.query('SHOW FULL PROCESSLIST')
  const [statusRows] = await conn.query(`SHOW GLOBAL STATUS WHERE Variable_name IN (
    'Aborted_connects', 'Aborted_clients', 'Threads_connected',
    'Threads_running', 'Max_used_connections', 'Connection_errors_max_connections',
    'Slow_queries'
  )`)
  const [varRows] = await conn.query(`SHOW VARIABLES WHERE Variable_name IN (
    'max_connections', 'wait_timeout', 'max_statement_time'
  )`)

  const status = Object.fromEntries(statusRows.map((r) => [r.Variable_name, r.Value]))
  const vars = Object.fromEntries(varRows.map((r) => [r.Variable_name, r.Value]))

  const ours = threads.filter((row) => {
    const db = String(row.db ?? '')
    const info = String(row.Info ?? '')
    return db === dbName || info.includes(dbName)
  })
  const heavy = ours
    .filter((row) => {
      if (row.Command === 'Sleep') return false
      return Number(row.Time ?? 0) >= 2 || HEAVY.test(String(row.State ?? ''))
    })
    .sort((a, b) => Number(b.Time ?? 0) - Number(a.Time ?? 0))

  console.log(`=== MariaDB processlist for ${dbName} ===\n`)
  if (!heavy.length) {
    console.log('No long / tmp-table / sort / lock queries for this database right now.')
  } else {
    console.log('Active expensive queries (KILL <Id> if stuck):\n')
    for (const row of heavy) {
      const info = String(row.Info ?? '').replace(/\s+/g, ' ').slice(0, 360)
      console.log(
        `  Id=${row.Id} Time=${row.Time}s State=${row.State || '-'} User=${row.User} Host=${row.Host}`
      )
      console.log(`    ${info || '(no SQL)'}\n`)
    }
  }

  const sleeping = ours.filter((row) => row.Command === 'Sleep').length
  const running = ours.filter((row) => row.Command !== 'Sleep').length
  console.log(`App-db threads: ${ours.length} (${running} active, ${sleeping} Sleep)`)
  console.log('\n=== Connection pressure ===')
  console.log(`  Threads_connected    ${status.Threads_connected ?? '?'}`)
  console.log(`  Threads_running      ${status.Threads_running ?? '?'}`)
  console.log(`  Max_used_connections ${status.Max_used_connections ?? '?'}`)
  console.log(`  max_connections      ${vars.max_connections ?? '?'}`)
  console.log(`  Aborted_connects     ${status.Aborted_connects ?? '?'}`)
  console.log(`  Aborted_clients      ${status.Aborted_clients ?? '?'}`)
  console.log(`  Slow_queries         ${status.Slow_queries ?? '?'}`)
} finally {
  await conn.end()
}
