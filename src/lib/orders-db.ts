import { queryDb } from '@/lib/db'

export type OrderRow = {
  id: string
  tracking_number?: string
  customer_email: string
  customer_name: string
  total: number
  status: string
  created_at: string
}

export type OrdersAggregateSummary = {
  orders: number
  revenue: number
  completedOrders: number
}

export async function listOrdersRecent(limit: number): Promise<OrderRow[]> {
  const safeLimit = Math.min(100, Math.max(1, limit))
  const rows = await queryDb<OrderRow[]>(
    `SELECT id, tracking_number, customer_email, customer_name, total, status, created_at
     FROM orders
     ORDER BY created_at DESC
     LIMIT ?`,
    [safeLimit]
  )
  return rows.map((r) => ({ ...r, total: Number(r.total) }))
}

export async function listOrdersPaginated(
  page: number,
  limit: number
): Promise<{ items: OrderRow[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const safeLimit = Math.min(100, Math.max(1, limit))
  const safePage = Math.max(1, page)
  const offset = (safePage - 1) * safeLimit

  const [countRows, rows] = await Promise.all([
    queryDb<{ total: number }[]>(`SELECT COUNT(*) AS total FROM orders`),
    queryDb<OrderRow[]>(
      `SELECT id, tracking_number, customer_email, customer_name, total, status, created_at
       FROM orders
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [safeLimit, offset]
    ),
  ])

  const total = Number(countRows[0]?.total ?? 0)
  const items = rows.map((r) => ({ ...r, total: Number(r.total) }))

  return {
    items,
    total,
    page: safePage,
    pageSize: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit) || 1),
  }
}

export async function getOrdersAggregateSummary(): Promise<OrdersAggregateSummary> {
  const rows = await queryDb<
    { orders: number; revenue: string | number; completedOrders: number }[]
  >(
    `SELECT
       COUNT(*) AS orders,
       COALESCE(SUM(total), 0) AS revenue,
       SUM(CASE WHEN status IN ('completed', 'paid') THEN 1 ELSE 0 END) AS completedOrders
     FROM orders`
  )
  const row = rows[0]
  return {
    orders: Number(row?.orders ?? 0),
    revenue: Number(row?.revenue ?? 0),
    completedOrders: Number(row?.completedOrders ?? 0),
  }
}
