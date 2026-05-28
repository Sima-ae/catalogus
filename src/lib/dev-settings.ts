import {
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
  SETTING_KEYS,
} from '@/lib/site-settings'
import { useDevFallback } from '@/lib/runtime'

let devSettings: SiteSettings = { ...DEFAULT_SITE_SETTINGS }

export function devSettingsEnabled() {
  return useDevFallback()
}

export function getDevSettings(): SiteSettings {
  return { ...devSettings }
}

export function updateDevSettings(updates: Partial<SiteSettings>): SiteSettings {
  for (const key of SETTING_KEYS) {
    if (updates[key] !== undefined) {
      devSettings[key] = String(updates[key] ?? '').trim()
    }
  }
  return getDevSettings()
}
