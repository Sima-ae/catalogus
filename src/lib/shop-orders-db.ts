import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'
import { productIsPurchasable } from '@/lib/shop-commerce'
import type { CatalogusStoreMode } from '@/lib/store-host'

export type ShopCheckoutLineInput = {
  productId: string
  quantity: number
}

export type ShopCheckoutCustomer = {
  name: string
  email: string
  phone?: string
}

export type ResolvedCheckoutLine = {
  productId: string
  name: string
  sku: string | null
  unitPrice: number
  quantity: number
  lineTotal: number
}

type ProductCheckoutRow = {
  id: string
  name: string
  sku: string | null
  price: number
  status: string
  sold_out: number | boolean
  featured: number | boolean
}

function makeOrderNumber(): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14)
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `SC-${stamp}-${rand}`
}

/** Load shop-visible products and recompute line totals from DB prices. */
export async function resolveCheckoutLines(
  items: ShopCheckoutLineInput[],
  storeMode: CatalogusStoreMode
): Promise<{ lines: ResolvedCheckoutLine[]; subtotal: number } | { error: string; status: number }> {
  if (!items.length) {
    return { error: 'Cart is empty', status: 400 }
  }

  const qtyById = new Map<string, number>()
  for (const item of items) {
    const id = String(item.productId || '').trim()
    const qty = Math.floor(Number(item.quantity))
    if (!id || !Number.isFinite(qty) || qty < 1 || qty > 99) {
      return { error: 'Invalid cart line', status: 400 }
    }
    qtyById.set(id, (qtyById.get(id) || 0) + qty)
  }

  const ids = Array.from(qtyById.keys())
  if (ids.length > 50) {
    return { error: 'Too many items', status: 400 }
  }

  const placeholders = ids.map(() => '?').join(', ')
  const rows = await queryDb<ProductCheckoutRow[]>(
    `SELECT id, name, sku, price, status, sold_out, featured
     FROM products
     WHERE id IN (${placeholders})`,
    ids
  )
  const byId = new Map(rows.map((row) => [String(row.id), row]))

  const lines: ResolvedCheckoutLine[] = []
  let subtotal = 0

  for (const id of ids) {
    const row = byId.get(id)
    if (!row) {
      return { error: `Product not found: ${id}`, status: 400 }
    }
    if (String(row.status) !== 'active') {
      return { error: `Product unavailable: ${row.name}`, status: 400 }
    }
    if (Number(row.sold_out) !== 0) {
      return { error: `Product sold out: ${row.name}`, status: 400 }
    }
    if (storeMode === 'featured' && Number(row.featured) !== 1) {
      return { error: `Product not available on this storefront: ${row.name}`, status: 400 }
    }
    const unitPrice = Number(row.price)
    if (!productIsPurchasable(unitPrice)) {
      return { error: `Product has no price: ${row.name}`, status: 400 }
    }
    const quantity = qtyById.get(id) || 0
    const lineTotal = Math.round(unitPrice * quantity * 100) / 100
    subtotal += lineTotal
    lines.push({
      productId: id,
      name: String(row.name),
      sku: row.sku ? String(row.sku) : null,
      unitPrice,
      quantity,
      lineTotal,
    })
  }

  subtotal = Math.round(subtotal * 100) / 100
  if (subtotal <= 0 || !lines.length) {
    return { error: 'Cart total is invalid', status: 400 }
  }

  return { lines, subtotal }
}

export type CreatePendingOrderResult = {
  orderId: string
  orderNumber: string
  total: number
  lines: ResolvedCheckoutLine[]
}

export async function createPendingShopOrder(input: {
  customer: ShopCheckoutCustomer
  lines: ResolvedCheckoutLine[]
  subtotal: number
  storeMode: CatalogusStoreMode
}): Promise<CreatePendingOrderResult> {
  const orderId = randomUUID()
  const orderNumber = makeOrderNumber()
  const total = input.subtotal
  const notes = JSON.stringify({ storeMode: input.storeMode })

  await queryDb(
    `INSERT INTO orders (
      id, order_number, customer_email, customer_name, customer_phone,
      subtotal, tax_amount, shipping_amount, discount_amount, total,
      currency, payment_method, payment_status, status, notes
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, 0, 0, 0, ?,
      'EUR', 'stripe', 'pending', 'pending', ?
    )`,
    [
      orderId,
      orderNumber,
      input.customer.email.trim().toLowerCase(),
      input.customer.name.trim(),
      input.customer.phone?.trim() || null,
      total,
      total,
      notes,
    ]
  )

  for (const line of input.lines) {
    await queryDb(
      `INSERT INTO order_items (
        id, order_id, product_id, product_name, product_sku,
        quantity, unit_price, total_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        orderId,
        line.productId,
        line.name,
        line.sku,
        line.quantity,
        line.unitPrice,
        line.lineTotal,
      ]
    )
  }

  return { orderId, orderNumber, total, lines: input.lines }
}

export async function setOrderStripeSessionId(
  orderId: string,
  stripeSessionId: string
): Promise<void> {
  try {
    await queryDb(`UPDATE orders SET stripe_session_id = ? WHERE id = ?`, [
      stripeSessionId,
      orderId,
    ])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('stripe_session_id') || message.includes('Unknown column')) {
      // Column not migrated yet — metadata on the Stripe session still has orderId.
      console.warn('[shop-orders] stripe_session_id column missing; skipping persist')
      return
    }
    throw error
  }
}

async function updateOrderPaidById(
  orderId: string,
  paymentMethodNote: string | null,
  stripeSessionId: string | null
): Promise<void> {
  try {
    await queryDb(
      `UPDATE orders
       SET status = 'paid',
           payment_status = 'paid',
           payment_method = COALESCE(?, payment_method),
           stripe_session_id = COALESCE(?, stripe_session_id)
       WHERE id = ? AND status <> 'paid'`,
      [paymentMethodNote, stripeSessionId, orderId]
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('stripe_session_id') || message.includes('Unknown column')) {
      await queryDb(
        `UPDATE orders
         SET status = 'paid',
             payment_status = 'paid',
             payment_method = COALESCE(?, payment_method)
         WHERE id = ? AND status <> 'paid'`,
        [paymentMethodNote, orderId]
      )
      return
    }
    throw error
  }
}

export async function markShopOrderPaid(input: {
  orderId?: string | null
  stripeSessionId?: string | null
  paymentIntentId?: string | null
}): Promise<void> {
  const paymentMethodNote = input.paymentIntentId
    ? `stripe_pi:${input.paymentIntentId}`
    : null

  if (input.orderId) {
    await updateOrderPaidById(
      input.orderId,
      paymentMethodNote,
      input.stripeSessionId || null
    )
    return
  }

  if (input.stripeSessionId) {
    try {
      await queryDb(
        `UPDATE orders
         SET status = 'paid',
             payment_status = 'paid',
             payment_method = COALESCE(?, payment_method)
         WHERE stripe_session_id = ? AND status <> 'paid'`,
        [paymentMethodNote, input.stripeSessionId]
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('stripe_session_id') || message.includes('Unknown column')) {
        console.warn('[shop-orders] stripe_session_id missing; cannot match session alone')
        return
      }
      throw error
    }
  }
}

export async function markShopOrderCancelled(input: {
  orderId?: string | null
  stripeSessionId?: string | null
}): Promise<void> {
  if (input.orderId) {
    await queryDb(
      `UPDATE orders
       SET status = 'cancelled', payment_status = 'cancelled'
       WHERE id = ? AND status = 'pending'`,
      [input.orderId]
    )
    return
  }
  if (input.stripeSessionId) {
    await queryDb(
      `UPDATE orders
       SET status = 'cancelled', payment_status = 'cancelled'
       WHERE stripe_session_id = ? AND status = 'pending'`,
      [input.stripeSessionId]
    )
  }
}
