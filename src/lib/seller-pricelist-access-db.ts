import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'
import { PLATFORM_PRICELIST_OWNER_ID } from '@/lib/pricelist-constants'

export type AccessStatus = 'pending' | 'approved' | 'rejected'

export type SellerPricelistAccessRow = {
  id: string
  seller_id: string
  list_owner_id: string
  status: AccessStatus
  approved_by: string | null
  approved_at: string | null
  created_at: string
  seller_email?: string
  seller_name?: string | null
  list_owner_email?: string
  list_owner_name?: string | null
  list_owner_role?: string
}

export async function hasApprovedSellerAccess(
  sellerId: string,
  listOwnerId: string
): Promise<boolean> {
  const rows = await queryDb<{ ok: number }[]>(
    `SELECT 1 AS ok FROM seller_pricelist_access
     WHERE seller_id = ? AND list_owner_id = ? AND status = 'approved' LIMIT 1`,
    [sellerId, listOwnerId]
  )
  return rows.length > 0
}

export async function listSellerAccess(filters?: {
  sellerId?: string
  listOwnerId?: string
}): Promise<SellerPricelistAccessRow[]> {
  const clauses: string[] = []
  const params: string[] = []

  if (filters?.sellerId) {
    clauses.push('spa.seller_id = ?')
    params.push(filters.sellerId)
  }
  if (filters?.listOwnerId) {
    clauses.push('spa.list_owner_id = ?')
    params.push(filters.listOwnerId)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

  return queryDb<SellerPricelistAccessRow[]>(
    `SELECT spa.id, spa.seller_id, spa.list_owner_id, spa.status, spa.approved_by, spa.approved_at, spa.created_at,
            s.email AS seller_email, s.name AS seller_name,
            lo.email AS list_owner_email, lo.name AS list_owner_name, lo.role AS list_owner_role
     FROM seller_pricelist_access spa
     INNER JOIN users s ON s.id = spa.seller_id
     LEFT JOIN users lo ON lo.id = spa.list_owner_id
     ${where}
     ORDER BY spa.created_at DESC`,
    params
  )
}

export async function createSellerAccess(input: {
  sellerId: string
  listOwnerId: string
}): Promise<SellerPricelistAccessRow> {
  const id = randomUUID()
  await queryDb(
    `INSERT INTO seller_pricelist_access (id, seller_id, list_owner_id, status)
     VALUES (?, ?, ?, 'pending')`,
    [id, input.sellerId, input.listOwnerId]
  )
  const rows = await listSellerAccess({ sellerId: input.sellerId })
  const row = rows.find((r) => r.id === id)
  if (!row) throw new Error('ACCESS_CREATE_FAILED')
  return row
}

export async function updateSellerAccessStatus(
  id: string,
  status: AccessStatus,
  approvedBy: string | null
): Promise<SellerPricelistAccessRow | null> {
  const approvedAt = status === 'approved' ? new Date() : null
  await queryDb(
    `UPDATE seller_pricelist_access
     SET status = ?, approved_by = ?, approved_at = ?
     WHERE id = ?`,
    [status, approvedBy, approvedAt, id]
  )
  const rows = await queryDb<SellerPricelistAccessRow[]>(
    `SELECT spa.id, spa.seller_id, spa.list_owner_id, spa.status, spa.approved_by, spa.approved_at, spa.created_at,
            s.email AS seller_email, s.name AS seller_name
     FROM seller_pricelist_access spa
     INNER JOIN users s ON s.id = spa.seller_id
     WHERE spa.id = ? LIMIT 1`,
    [id]
  )
  return rows[0] ?? null
}

export async function listApprovedBuyersForSeller(sellerId: string): Promise<
  { id: string; email: string; name: string | null }[]
> {
  return queryDb<{ id: string; email: string; name: string | null }[]>(
    `SELECT u.id, u.email, u.name
     FROM seller_pricelist_access spa
     INNER JOIN users u ON u.id = spa.list_owner_id
     WHERE spa.seller_id = ? AND spa.status = 'approved' AND u.role = 'buyer'
     ORDER BY u.email ASC`,
    [sellerId]
  )
}

export async function getAccessById(id: string): Promise<SellerPricelistAccessRow | null> {
  const rows = await listSellerAccess()
  return rows.find((r) => r.id === id) ?? null
}
