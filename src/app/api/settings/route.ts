import { NextRequest, NextResponse } from 'next/server'
import {
  SETTING_KEYS,
  type SettingKey,
} from '@/lib/settings-db'
import { loadSiteSettings, saveSiteSettings } from '@/lib/settings-persistence'
import { isDevDataFallbackEnabled } from '@/lib/dev-seed'
import { getDevSettings, updateDevSettings } from '@/lib/dev-settings'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function parseBody(body: unknown): Partial<Record<SettingKey, string>> {
  if (!body || typeof body !== 'object') return {}
  const raw = body as Record<string, unknown>
  const updates: Partial<Record<SettingKey, string>> = {}
  for (const key of SETTING_KEYS) {
    if (raw[key] !== undefined) {
      updates[key] = String(raw[key] ?? '').trim()
    }
  }
  return updates
}

export async function GET() {
  try {
    const { settings, storage } = await loadSiteSettings()
    return NextResponse.json({ ...settings, _storage: storage })
  } catch (error) {
    console.error('Settings fetch error:', error)
    if (isDevDataFallbackEnabled()) {
      return NextResponse.json({
        ...getDevSettings(),
        _storage: 'file',
      })
    }
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const updates = parseBody(await request.json())
  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'No settings provided' }, { status: 400 })
  }

  try {
    const { settings, storage } = await saveSiteSettings(updates)
    return NextResponse.json({ ...settings, _storage: storage })
  } catch (error) {
    console.error('Settings update error:', error)
    if (isDevDataFallbackEnabled()) {
      const settings = updateDevSettings(updates)
      return NextResponse.json({ ...settings, _storage: 'file' })
    }
    return NextResponse.json(
      {
        error:
          'Failed to save settings. Check DATABASE_URL and that MariaDB is running, or run the settings migration.',
      },
      { status: 500 }
    )
  }
}
