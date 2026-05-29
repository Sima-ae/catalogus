import { loadEnvConfig } from '@next/env'
import { resolve } from 'path'

let loaded = false

/** Load `.env` / `.env.production` from the app root (Node.js routes only). */
export function ensureEnvLoaded() {
  if (loaded) return
  loaded = true
  const cwd = process.cwd()
  const { loadedEnvFiles } = loadEnvConfig(resolve(cwd))
  if (process.env.NODE_ENV === 'production') {
    const secret = process.env.SITE_ACCESS_COOKIE_SECRET?.trim()
    if (!secret || secret.length < 16) {
      console.warn(
        '[env] SITE_ACCESS_COOKIE_SECRET missing or shorter than 16 characters after loading .env',
        loadedEnvFiles.length ? `(loaded: ${loadedEnvFiles.join(', ')})` : '(no .env files found)'
      )
    }
  }
}
