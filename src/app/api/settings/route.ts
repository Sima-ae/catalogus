import { NextRequest, NextResponse } from 'next/server'
import {
  SETTING_KEYS,
  type SettingKey,
  listSettings,
  upsertSettings,
} from '@/lib/settings-db'
import { devSettingsEnabled, getDevSettings, updateDevSettings } from '@/lib/dev-settings'
import { isDevDataFallbackEnabled } from '@/lib/dev-seed'

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
    const settings = await listSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Settings fetch error:', error)
    if (isDevDataFallbackEnabled()) {
      return NextResponse.json(getDevSettings())
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
    const settings = await upsertSettings(updates)
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Settings update error:', error)
    if (devSettingsEnabled()) {
      return NextResponse.json(updateDevSettings(updates))
    }
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
