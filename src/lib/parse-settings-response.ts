import type { SiteSettings } from '@/lib/site-settings'
import { DEFAULT_SITE_SETTINGS } from '@/lib/site-settings'
import { normalizeSiteTaglineForStorage } from '@/lib/site-tagline'

export type SettingsStorage = 'database'

export function parseSettingsResponse(data: unknown): {
  settings: SiteSettings
  storage?: SettingsStorage
} {
  if (!data || typeof data !== 'object' || 'error' in (data as object)) {
    return { settings: { ...DEFAULT_SITE_SETTINGS } }
  }
  const raw = data as Record<string, unknown>
  const storage = raw._storage === 'database' ? 'database' : undefined
  const settings = { ...DEFAULT_SITE_SETTINGS }
  for (const key of Object.keys(DEFAULT_SITE_SETTINGS) as (keyof SiteSettings)[]) {
    if (raw[key] !== undefined) {
      const value = String(raw[key] ?? '')
      settings[key] =
        key === 'site_tagline' ? normalizeSiteTaglineForStorage(value) : value
    }
  }
  return { settings, storage }
}
