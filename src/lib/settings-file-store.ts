import fs from 'fs'
import path from 'path'
import {
  DEFAULT_SITE_SETTINGS,
  SETTING_KEYS,
  type SiteSettings,
} from '@/lib/site-settings'

const SETTINGS_FILE = path.join(process.cwd(), '.data', 'site-settings.json')

function ensureDir() {
  const dir = path.dirname(SETTINGS_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function readSettingsFile(): SiteSettings | null {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return null
    const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) as Record<string, unknown>
    const out = { ...DEFAULT_SITE_SETTINGS }
    for (const key of SETTING_KEYS) {
      if (raw[key] !== undefined) {
        out[key] = String(raw[key] ?? '').trim()
      }
    }
    return out
  } catch {
    return null
  }
}

export function writeSettingsFile(settings: SiteSettings): void {
  ensureDir()
  const payload: Record<string, string> = {}
  for (const key of SETTING_KEYS) {
    payload[key] = String(settings[key] ?? '').trim()
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(payload, null, 2), 'utf8')
}

export function getSettingsFilePath() {
  return SETTINGS_FILE
}
