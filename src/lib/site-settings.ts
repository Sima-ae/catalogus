import { APP_NAME } from '@/lib/brand'

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
  site_tagline: 'Digital marketplace for templates and digital assets',
  support_email: '',
  currency: 'EUR',
  tax_rate: '0',
}
