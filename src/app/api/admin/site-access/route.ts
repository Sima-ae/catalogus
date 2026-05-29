import { NextRequest, NextResponse } from 'next/server'
import { parseAdminCredentials, verifySuperAdmin } from '@/lib/admin-api-auth'
import { getSiteAccessConfig } from '@/lib/site-access'
import { saveSiteAccessForAdmin } from '@/lib/site-access-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Load site-access lock status (super admin credentials in JSON body). */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const creds = parseAdminCredentials(body)
  if (!creds) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 400 }
    )
  }

  const admin = await verifySuperAdmin(creds.email, creds.password)
  if (!admin.ok) {
    return NextResponse.json({ error: 'Super admin access denied' }, { status: 403 })
  }

  try {
    const config = await getSiteAccessConfig()
    return NextResponse.json({
      lockActive: config.required,
      hasPassword: !!config.passwordHash,
      version: config.version,
    })
  } catch (error) {
    console.error('Admin site access POST error:', error)
    return NextResponse.json({ error: 'Failed to load site access settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const creds = parseAdminCredentials(body)
  if (!creds) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 400 }
    )
  }

  const admin = await verifySuperAdmin(creds.email, creds.password)
  if (!admin.ok) {
    return NextResponse.json({ error: 'Super admin access denied' }, { status: 403 })
  }

  try {
    const enabled =
      body.enabled === true || body.enabled === 'true'
        ? true
        : body.enabled === false || body.enabled === 'false'
          ? false
          : undefined

    const newPassword =
      body.newPassword !== undefined ? String(body.newPassword) : undefined
    const clearPassword =
      body.clearPassword === true || body.clearPassword === 'true'

    if (newPassword !== undefined && newPassword.length > 0 && newPassword.length < 4) {
      return NextResponse.json(
        { error: 'Site access password must be at least 4 characters' },
        { status: 400 }
      )
    }

    await saveSiteAccessForAdmin({
      enabled,
      newPassword: newPassword?.trim() || undefined,
      clearPassword,
    })

    const config = await getSiteAccessConfig()
    return NextResponse.json({
      lockActive: config.required,
      hasPassword: !!config.passwordHash,
      version: config.version,
    })
  } catch (error) {
    console.error('Admin site access PUT error:', error)
    return NextResponse.json({ error: 'Failed to save site access settings' }, { status: 500 })
  }
}
