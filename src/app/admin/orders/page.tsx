'use client'

import { useEffect, useState } from 'react'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTd,
  AdminTh,
  AdminTr,
} from '@/components/admin/AdminTable'
import { useAppTheme } from '@/lib/theme-classes'
import { formatPrice } from '@/lib/format-price'
import { appPath } from '@/lib/paths'

type Order = {
  id: string
  customer_name: string
  customer_email: string
  total: number
  status: string
  created_at: string
}

type OrdersPage = {
  items: Order[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const PAGE_SIZE = 50

export default function AdminOrdersPage() {
  const t = useAppTheme()
  const [orders, setOrders] = useState<Order[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(appPath(`/api/orders?page=${currentPage}&limit=${PAGE_SIZE}`))
      .then((r) => r.json())
      .then((d: OrdersPage | Order[]) => {
        if (d && typeof d === 'object' && 'items' in d && Array.isArray(d.items)) {
          setOrders(d.items)
          setTotalItems(d.total)
        } else {
          setOrders(Array.isArray(d) ? d : [])
          setTotalItems(Array.isArray(d) ? d.length : 0)
        }
      })
      .finally(() => setLoading(false))
  }, [currentPage])

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE) || 1)
  const safePage = Math.min(Math.max(1, currentPage), totalPages)

  return (
    <AdminPageShell titleKey="admin.nav.orders">
      {loading ? (
        <p className={t.muted}>Loading...</p>
      ) : totalItems === 0 ? (
        <AdminEmptyState title="No orders yet" description="Orders will show here after customers checkout." />
      ) : (
        <>
          <p className={`text-sm mb-3 ${t.muted}`}>
            {totalItems} order{totalItems === 1 ? '' : 's'}
            {totalPages > 1 && (
              <>
                {' '}
                · page {safePage} of {totalPages}
              </>
            )}
          </p>
          <AdminTable>
            <AdminTableHead>
              <AdminTh>ID</AdminTh>
              <AdminTh>Customer</AdminTh>
              <AdminTh>Total</AdminTh>
              <AdminTh>Status</AdminTh>
            </AdminTableHead>
            <AdminTableBody>
              {orders.map((o) => (
                <AdminTr key={o.id}>
                  <AdminTd className="text-sm">{o.id}</AdminTd>
                  <AdminTd>{o.customer_name}</AdminTd>
                  <AdminTd>{formatPrice(o.total)}</AdminTd>
                  <AdminTd className="capitalize">{o.status}</AdminTd>
                </AdminTr>
              ))}
            </AdminTableBody>
          </AdminTable>
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(safePage - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(safePage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </AdminPageShell>
  )
}
