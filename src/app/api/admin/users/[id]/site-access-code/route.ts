import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { getDbErrorMessage } from '@/lib/db-errors'
import {
  assignSiteAccessCodeToUser,
  getSiteAccessCodeAssignment,
  reassignSiteAccessCodeToUser,
  unassignSiteAccessCodeFromUser,
} from '@/lib/site-access-codes-db'
import { getUserProfile } from '@/lib/users-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function mapAssignError(error: unknown): NextResponse | null {
  const message = error instanceof Error ? error.message : ''
  if (message === 'INVALID_SITE_ACCESS_CODE') {
    return jsonError('Invalid access code format', 400)
  }
  if (message === 'CODE_NOT_FOUND') {
    return jsonError('Access code not found in the pool', 400)
  }
  if (message === 'CODE_ALREADY_ASSIGNED') {
    return jsonError('This access code is already assigned to another user', 409)
  }
  if (message === 'USER_ALREADY_HAS_CODE') {
    return jsonError('This user already has an access code assigned', 409)
  }
  if (message === 'USER_HAS_NO_CODE') {
    return jsonError('This user has no access code assigned', 400)
  }
  return null
}

async function assertBuyerUser(userId: string) {
  const user = await getUserProfile(userId)
  if (!user) return { error: jsonError('User not found', 404) as NextResponse }
  if (user.role !== 'buyer') {
    return { error: jsonError('Access codes can only be assigned to buyer accounts', 400) as NextResponse }
  }
  return { user }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) return jsonError(auth.error, auth.status)

  const buyerCheck = await assertBuyerUser(params.id)
  if (buyerCheck.error) return buyerCheck.error

  try {
    const assignment = await getSiteAccessCodeAssignment(params.id)
    return NextResponse.json(assignment)
  } catch (error) {
    console.error('Admin site access code GET error:', error)
    return jsonError(getDbErrorMessage(error, 'Failed to load access code'), 503)
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) return jsonError(auth.error, auth.status)

  const buyerCheck = await assertBuyerUser(params.id)
  if (buyerCheck.error) return buyerCheck.error

  const body = await request.json().catch(() => null)
  const code = body && typeof body === 'object' ? String((body as { code?: unknown }).code ?? '').trim() : ''
  if (!code) return jsonError('Access code is required', 400)

  try {
    await assignSiteAccessCodeToUser({ code, userId: params.id })
    const assignment = await getSiteAccessCodeAssignment(params.id)
    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    const mapped = mapAssignError(error)
    if (mapped) return mapped
    console.error('Admin site access code POST error:', error)
    return jsonError(getDbErrorMessage(error, 'Failed to assign access code'), 503)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) return jsonError(auth.error, auth.status)
  if (!auth.actor.isSuperAdmin) {
    return jsonError('Only super admin can change an assigned access code', 403)
  }

  const buyerCheck = await assertBuyerUser(params.id)
  if (buyerCheck.error) return buyerCheck.error

  const body = await request.json().catch(() => null)
  const code = body && typeof body === 'object' ? String((body as { code?: unknown }).code ?? '').trim() : ''
  if (!code) return jsonError('Access code is required', 400)

  try {
    await reassignSiteAccessCodeToUser({ userId: params.id, code })
    const assignment = await getSiteAccessCodeAssignment(params.id)
    return NextResponse.json(assignment)
  } catch (error) {
    const mapped = mapAssignError(error)
    if (mapped) return mapped
    console.error('Admin site access code PATCH error:', error)
    return jsonError(getDbErrorMessage(error, 'Failed to update access code'), 503)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await verifyAdminActor(request)
  if (!auth.ok) return jsonError(auth.error, auth.status)
  if (!auth.actor.isSuperAdmin) {
    return jsonError('Only super admin can remove an assigned access code', 403)
  }

  const buyerCheck = await assertBuyerUser(params.id)
  if (buyerCheck.error) return buyerCheck.error

  try {
    await unassignSiteAccessCodeFromUser(params.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const mapped = mapAssignError(error)
    if (mapped) return mapped
    console.error('Admin site access code DELETE error:', error)
    return jsonError(getDbErrorMessage(error, 'Failed to remove access code'), 503)
  }
}
