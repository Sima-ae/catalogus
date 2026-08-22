#!/usr/bin/env npx tsx
/**
 * Inspect MariaDB threads for supe_r_clones_cloud (run on the VPS).
 *
 *   npm run db:show-processlist
 *
 * Looks for high Time, Copying to tmp table, Sorting result, Waiting for table lock,
 * and aborted-connection counters.
 */
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { queryDb, resetDbPool, resolveDatabaseUrl } from '@/lib/db'

const HEAVY_STATES = /copying to tmp table|sorting result|waiting for table lock|creating sort index|sending data|locked/i

type ProcessRow = {
  Id: number
  User: string
  Host: string
  db: string | null
  Command: string
  Time: number
  State: string | null
  Info: string | null
}

function databaseName(): string {
  try {
    return new URL(resolveDatabaseUrl()).pathname.replace(/^\//, '') || 'supe_r_clones_cloud'
  } catch {
    return process.env.DB_NAME?.trim() || 'supe_r_clones_cloud'
  }
}

function statusMap(rows: { Variable_name: string; Value: string }[]): Map<string, string> {
  return new Map(rows.map((row) => [row.Variable_name, String(row.Value)]))
}

async function main() {
  ensureEnvLoaded()
  const dbName = databaseName()
  console.log(`=== MariaDB processlist for ${dbName} ===\n`)

  const [threads, statusRows, varRows] = await Promise.all([
    queryDb<ProcessRow[]>('SHOW FULL PROCESSLIST'),
    queryDb<{ Variable_name: string; Value: string }[]>(
      `SHOW GLOBAL STATUS WHERE Variable_name IN (
        'Aborted_connects', 'Aborted_clients', 'Threads_connected',
        'Threads_running', 'Max_used_connections', 'Connection_errors_max_connections',
        'Slow_queries'
      )`
    ),
    queryDb<{ Variable_name: string; Value: string }[]>(
      `SHOW VARIABLES WHERE Variable_name IN (
        'max_connections', 'wait_timeout', 'interactive_timeout',
        'max_statement_time', 'tmp_table_size', 'max_heap_table_size'
      )`
    ),
  ])

  const ours = threads.filter((row) => {
    const db = String(row.db ?? '')
    const info = String(row.Info ?? '')
    return db === dbName || info.includes(dbName)
  })
  const others = threads.filter((row) => row.Command !== 'Sleep' && !ours.includes(row))

  const heavy = ours
    .filter((row) => {
      if (row.Command === 'Sleep') return false
      const time = Number(row.Time ?? 0)
      return time >= 2 || HEAVY_STATES.test(String(row.State ?? ''))
    })
    .sort((a, b) => Number(b.Time ?? 0) - Number(a.Time ?? 0))

  if (!heavy.length) {
    console.log('No long / tmp-table / sort / lock queries for this database right now.')
  } else {
    console.log('Active expensive queries (KILL <Id> if stuck):\n')
    for (const row of heavy) {
      const info = String(row.Info ?? '').replace(/\s+/g, ' ').slice(0, 320)
      console.log(
        `  Id=${row.Id} Time=${row.Time}s State=${row.State || '-'} User=${row.User} Host=${row.Host}`
      )
      console.log(`    ${info || '(no SQL)'}\n`)
    }
  }

  const sleeping = ours.filter((row) => row.Command === 'Sleep').length
  const running = ours.filter((row) => row.Command !== 'Sleep').length
  console.log(`App-db threads: ${ours.length} (${running} active, ${sleeping} Sleep)`)
  if (others.length) {
    console.log(`Other non-sleep threads on this server: ${others.length}`)
  }

  const status = statusMap(statusRows)
  const vars = statusMap(varRows)
  console.log('\n=== Connection pressure ===')
  console.log(`  Threads_connected           ${status.get('Threads_connected') ?? '?'}`)
  console.log(`  Threads_running             ${status.get('Threads_running') ?? '?'}`)
  console.log(`  Max_used_connections        ${status.get('Max_used_connections') ?? '?'}`)
  console.log(`  max_connections             ${vars.get('max_connections') ?? '?'}`)
  console.log(`  Aborted_connects            ${status.get('Aborted_connects') ?? '?'}`)
  console.log(`  Aborted_clients             ${status.get('Aborted_clients') ?? '?'}`)
  console.log(
    `  Connection_errors_max_conn  ${status.get('Connection_errors_max_connections') ?? '?'}`
  )
  console.log(`  Slow_queries                ${status.get('Slow_queries') ?? '?'}`)
  console.log(`  wait_timeout                ${vars.get('wait_timeout') ?? '?'}`)
  console.log(`  max_statement_time          ${vars.get('max_statement_time') ?? '?'}`)

  const aborted = Number(status.get('Aborted_connects') ?? 0) + Number(status.get('Aborted_clients') ?? 0)
  if (aborted > 0) {
    console.log(
      '\nAborted connections usually mean the app timed out or opened too many checkouts.'
    )
    console.log('  Keep DB_CONNECTION_LIMIT modest, stop extra import workers, restart catalogus.')
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => resetDbPool())
