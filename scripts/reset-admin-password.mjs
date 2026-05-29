#!/usr/bin/env node
/**
 * Reset super admin password in MariaDB (production VPS).
 * Usage:
 *   node scripts/reset-admin-password.mjs
 *   node scripts/reset-admin-password.mjs 'YourNewPassword'
 *
 * Requires DATABASE_URL in environment (load from .env on VPS).
 */
import bcrypt from 'bcryptjs'
import mysql from 'mysql2/promise'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const SUPER_ADMIN_EMAIL = 'info@000.it.com'
const DEFAULT_PASSWORD = 'Admin123!'

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

function resolveDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) throw new Error('DATABASE_URL is not set')
  return url.replace(/^mariadb:\/\//, 'mysql://')
}

async function main() {
  loadEnv()
  const plain = process.argv[2] || DEFAULT_PASSWORD
  if (plain.length < 8) {
    console.error('Password must be at least 8 characters')
    process.exit(1)
  }

  const hash = await bcrypt.hash(plain, 12)
  const pool = mysql.createPool({ uri: resolveDatabaseUrl(), connectionLimit: 1 })

  try {
    const [result] = await pool.query(
      `UPDATE users SET password_hash = ?, role = 'admin', is_super_admin = 1
       WHERE LOWER(email) = ?`,
      [hash, SUPER_ADMIN_EMAIL.toLowerCase()]
    )
    const affected = result.affectedRows ?? 0
    if (affected === 0) {
      console.error(`No user found for ${SUPER_ADMIN_EMAIL}. Import db/supe_r_clones_cloud_users.sql first.`)
      process.exit(1)
    }
    console.log(`Updated password for ${SUPER_ADMIN_EMAIL} (${affected} row(s)).`)
    console.log('Sign in at /login with that email and your new password.')
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
