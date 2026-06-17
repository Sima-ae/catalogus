import {
  listSettings as listSettingsFromDb,
  upsertSettings as upsertSettingsToDb,
  type SiteSettings,
} from '@/lib/settings-db'
import { invalidateCachedNamespace } from '@/lib/server-ttl-cache'

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
  invalidateCachedNamespace('shop-bootstrap')
  return { settings, storage: 'database' }
}
