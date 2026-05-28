/** Settings keys for site-wide access password (stored in `settings` table). */
export const SITE_ACCESS_KEYS = [
  'site_access_enabled',
  'site_access_password_hash',
  'site_access_version',
] as const

export type SiteAccessSettingKey = (typeof SITE_ACCESS_KEYS)[number]

export const DEFAULT_SITE_ACCESS = {
  site_access_enabled: 'false',
  site_access_password_hash: '',
  site_access_version: '0',
} as const
