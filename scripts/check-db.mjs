#!/usr/bin/env node
/**
 * Test MariaDB connection using .env (DATABASE_URL or DB_*)
 * Usage: npm run db:check
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

const env = loadEnv()
const url = resolveDatabaseUrl()
const safe = url.replace(/:([^:@/]+)@/, ':***@')
console.log('Testing', safe, '...')

try {
  const conn = await mysql.createConnection({ uri: url, connectTimeout: 10000 })
  const [rows] = await conn.query('SELECT COUNT(*) AS c FROM users')
  console.log('OK — connected. Users in DB:', rows[0].c)
  await conn.end()
  process.exit(0)
} catch (err) {
  console.error('FAILED:', err.code || err.message)
  if (err.code === 'ECONNREFUSED') {
    console.error(`
Nothing on localhost:3306.

• On VPS: app and MariaDB must run on the SAME server, then DATABASE_URL with 127.0.0.1 works.
• On your Mac: run  npm run db:tunnel  in another terminal first (SSH to VPS).
`)
  }
  process.exit(1)
}
