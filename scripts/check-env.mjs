#!/usr/bin/env node
/**
 * Verify production .env on the VPS (no secret values printed).
 * Usage: node scripts/check-env.mjs
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const root = resolve(process.cwd())
const envPath = resolve(root, '.env')

function loadDotEnv(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadDotEnv(envPath)

const required = ['DATABASE_URL', 'SITE_ACCESS_COOKIE_SECRET']
let ok = true

console.log(`App root: ${root}`)
console.log(`.env file: ${existsSync(envPath) ? envPath : 'MISSING'}`)

for (const key of required) {
  const val = process.env[key]?.trim()
  if (!val) {
    console.error(`FAIL: ${key} is not set`)
    ok = false
    continue
  }
  if (key === 'SITE_ACCESS_COOKIE_SECRET' && val.length < 16) {
    console.error(`FAIL: ${key} must be at least 16 characters (got ${val.length})`)
    ok = false
    continue
  }
  console.log(`OK: ${key} is set (${val.length} chars)`)
}

if (process.env.AUTH_DEV_FALLBACK === 'true') {
  console.warn('WARN: AUTH_DEV_FALLBACK=true — should be false on production')
}

process.exit(ok ? 0 : 1)
