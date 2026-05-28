#!/usr/bin/env node
/** Wait until MariaDB accepts connections (for dev:local) */
import fs from 'node:fs'
import mysql from 'mysql2/promise'

function loadEnv() {
  const raw = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8')
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

const env = loadEnv()
const url = (env.DATABASE_URL || '').replace(/^mariadb:\/\//, 'mysql://')

for (let i = 0; i < 30; i++) {
  try {
    const c = await mysql.createConnection({ uri: url, connectTimeout: 3000 })
    await c.query('SELECT 1')
    await c.end()
    console.log('Database ready.')
    process.exit(0)
  } catch {
    await new Promise((r) => setTimeout(r, 2000))
  }
}
console.error('Database did not become ready in time. Run: npm run db:local')
process.exit(1)
