import {
  listSettings as listSettingsFromDb,
  upsertSettings as upsertSettingsToDb,
  type SiteSettings,
} from '@/lib/settings-db'

export type SettingsStorage = 'database'

export type SettingsLoadResult = {
  settings: SiteSettings
  storage: SettingsStorage
}

export type SettingsSaveResult = SettingsLoadResult

/** Site settings from the `settings` table only. */
export async function loadSiteSettings(): Promise<SettingsLoadResult> {
  const settings = await listSettingsFromDb()
  return { settings, storage: 'database' }
}

export async function saveSiteSettings(
  updates: Partial<SiteSettings>
): Promise<SettingsSaveResult> {
  const settings = await upsertSettingsToDb(updates)
  return { settings, storage: 'database' }
}
