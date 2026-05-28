import {
  listSettings as listSettingsFromDb,
  upsertSettings as upsertSettingsToDb,
  type SiteSettings,
} from '@/lib/settings-db'
import { isDevDataFallbackEnabled } from '@/lib/dev-seed'
import { isDbConnectionError } from '@/lib/db'
import { DEFAULT_SITE_SETTINGS } from '@/lib/site-settings'
import { readSettingsFile, writeSettingsFile } from '@/lib/settings-file-store'

export type SettingsStorage = 'database' | 'file' | 'default'

export type SettingsLoadResult = {
  settings: SiteSettings
  storage: SettingsStorage
}

export type SettingsSaveResult = SettingsLoadResult

function canUseFileFallback(error: unknown): boolean {
  return isDevDataFallbackEnabled() && isDbConnectionError(error)
}

export async function loadSiteSettings(): Promise<SettingsLoadResult> {
  try {
    const settings = await listSettingsFromDb()
    return { settings, storage: 'database' }
  } catch (error) {
    if (!canUseFileFallback(error)) {
      throw error
    }
    const fromFile = readSettingsFile()
    if (fromFile) {
      return { settings: fromFile, storage: 'file' }
    }
    return { settings: { ...DEFAULT_SITE_SETTINGS }, storage: 'default' }
  }
}

export async function saveSiteSettings(
  updates: Partial<SiteSettings>
): Promise<SettingsSaveResult> {
  try {
    const settings = await upsertSettingsToDb(updates)
    return { settings, storage: 'database' }
  } catch (error) {
    if (!canUseFileFallback(error)) {
      throw error
    }
    const current = readSettingsFile() ?? { ...DEFAULT_SITE_SETTINGS }
    const merged = { ...current }
    for (const key of Object.keys(updates) as (keyof SiteSettings)[]) {
      if (updates[key] !== undefined) {
        merged[key] = String(updates[key] ?? '').trim()
      }
    }
    writeSettingsFile(merged)
    return { settings: merged, storage: 'file' }
  }
}
