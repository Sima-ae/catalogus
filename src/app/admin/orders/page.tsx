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

export default function AdminOrdersPage() {
  const t = useAppTheme()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(appPath('/api/orders'))
      .then((r) => r.json())
      .then((d) => setOrders(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminPageShell title="Orders" description="All customer orders.">
      {loading ? (
        <p className={t.muted}>Loading...</p>
      ) : orders.length === 0 ? (
        <AdminEmptyState title="No orders yet" description="Orders will show here after customers checkout." />
      ) : (
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
      )}
    </AdminPageShell>
  )
}
