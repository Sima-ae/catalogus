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
const url = resolveDatabaseUrl(env)
const safe = url.replace(/:([^:@/]+)@/, ':***@')
console.log('Testing', safe, '...')

try {
  const conn = await mysql.createConnection({ uri: url, connectTimeout: 10000 })
  const [users] = await conn.query('SELECT COUNT(*) AS c FROM users')
  let productCount = '?'
  try {
    const [products] = await conn.query('SELECT COUNT(*) AS c FROM products')
    productCount = String(products[0].c)
  } catch {
    productCount = '(table missing — import db/supe_r_clones_cloud_init.sql)'
  }
  console.log('OK — connected. Users:', users[0].c, '| Products:', productCount)
  await conn.end()
  process.exit(0)
} catch (err) {
  console.error('FAILED:', err.code || err.message)
  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error(`
Access denied — wrong user or password in .env DATABASE_URL.

• CyberPanel → Databases → List Databases → supe_r_clones_cloud → copy the DB password
• Update /var/www/superclones.cloud/.env then: sudo systemctl restart catalogus
`)
  }
  if (err.code === 'ECONNREFUSED') {
    console.error(`
Nothing on localhost:3306.

• On VPS: app and MariaDB must run on the SAME server, then DATABASE_URL with 127.0.0.1 works.
• On your Mac: run  npm run db:tunnel  in another terminal first (SSH as root).
`)
  }
  process.exit(1)
}
