import {
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
  SETTING_KEYS,
} from '@/lib/site-settings'
import { isDevFallbackEnabled } from '@/lib/runtime'
import { readSettingsFile, writeSettingsFile } from '@/lib/settings-file-store'

let devSettings: SiteSettings = { ...DEFAULT_SITE_SETTINGS }

function hydrateFromFile() {
  const fromFile = readSettingsFile()
  if (fromFile) {
    devSettings = { ...fromFile }
  }
}

hydrateFromFile()

export function devSettingsEnabled() {
  return isDevFallbackEnabled()
}

export function getDevSettings(): SiteSettings {
  hydrateFromFile()
  return { ...devSettings }
}

export function updateDevSettings(updates: Partial<SiteSettings>): SiteSettings {
  hydrateFromFile()
  for (const key of SETTING_KEYS) {
    if (updates[key] !== undefined) {
      devSettings[key] = String(updates[key] ?? '').trim()
    }
  }
  writeSettingsFile(devSettings)
  return getDevSettings()
}
