import { APP_NAME } from '@/lib/brand'
import { DEFAULT_SITE_TAGLINE } from '@/lib/site-tagline'

export const SETTING_KEYS = [
  'site_name',
  'site_tagline',
  'support_email',
  'currency',
  'tax_rate',
] as const

export type SettingKey = (typeof SETTING_KEYS)[number]

export type SiteSettings = Record<SettingKey, string>

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  site_name: APP_NAME,
  site_tagline: DEFAULT_SITE_TAGLINE,
  support_email: '',
  currency: 'EUR',
  tax_rate: '0',
}
