import type { SiteSettings } from '@/lib/site-settings'
import { DEFAULT_SITE_SETTINGS } from '@/lib/site-settings'

export type SettingsStorage = 'database' | 'file' | 'default'

export function parseSettingsResponse(data: unknown): {
  settings: SiteSettings
  storage?: SettingsStorage
} {
  if (!data || typeof data !== 'object' || 'error' in (data as object)) {
    return { settings: { ...DEFAULT_SITE_SETTINGS } }
  }
  const raw = data as Record<string, unknown>
  const storage = raw._storage as SettingsStorage | undefined
  const settings = { ...DEFAULT_SITE_SETTINGS }
  for (const key of Object.keys(DEFAULT_SITE_SETTINGS) as (keyof SiteSettings)[]) {
    if (raw[key] !== undefined) {
      settings[key] = String(raw[key] ?? '')
    }
  }
  return { settings, storage }
}
