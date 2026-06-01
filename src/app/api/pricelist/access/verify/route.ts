import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getCookieSecret } from '@/lib/site-access-cookie'
import { getDbErrorMessage } from '@/lib/db-errors'
import { parsePricelistOwnerParam } from '@/lib/pricelist-constants'
import {
  createPricelistUnlockToken,
  getPricelistUnlockCookieOptions,
  getPricelistContributorCookieOptions,
  PRICELIST_UNLOCK_COOKIE,
  PRICELIST_CONTRIBUTOR_COOKIE,
  readPricelistContributorId,
} from '@/lib/pricelist-access-cookie'
import {
  getPricelistShareSettings,
  verifyPricelistSharePassword,
} from '@/lib/pricelist-share-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  if (!getCookieSecret()) {
    return NextResponse.json(
      {
        error:
          'Pricelist unlock is not configured (SITE_ACCESS_COOKIE_SECRET missing on server).',
      },
      { status: 503 }
    )
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const ownerParam = String(raw.owner ?? raw.ownerId ?? '').trim()
  const password = String(raw.password ?? '')
  const remember = Boolean(raw.remember)

  const listOwnerId = parsePricelistOwnerParam(ownerParam)
  if (!listOwnerId || !password) {
    return NextResponse.json({ error: 'owner and password are required' }, { status: 400 })
  }

  try {
    const settings = await getPricelistShareSettings(listOwnerId)
    if (!settings.has_password) {
      return NextResponse.json(
        { error: 'This pricelist does not have a share password. Sign in instead.' },
        { status: 400 }
      )
    }

    const valid = await verifyPricelistSharePassword(listOwnerId, password)
    if (!valid) {
      return NextResponse.json({ error: 'Incorrect pricelist password' }, { status: 401 })
    }

    const unlock = await createPricelistUnlockToken(listOwnerId, settings.version, remember)
    if (!unlock) {
      return NextResponse.json({ error: 'Unable to create unlock session' }, { status: 503 })
    }

    const res = NextResponse.json({ ok: true, ownerId: listOwnerId })
    res.cookies.set(PRICELIST_UNLOCK_COOKIE, unlock.token, getPricelistUnlockCookieOptions(unlock.maxAge))
    if (!readPricelistContributorId(request.headers.get('cookie'))) {
      res.cookies.set(
        PRICELIST_CONTRIBUTOR_COOKIE,
        randomUUID(),
        getPricelistContributorCookieOptions()
      )
    }
    return res
  } catch (error) {
    console.error('Pricelist access verify:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, 'Verification failed') },
      { status: 503 }
    )
  }
}
