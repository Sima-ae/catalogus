'use client'

import { useEffect, useState } from 'react'
import AdminPageShell from '@/components/admin/AdminPageShell'

type Order = {
  id: string
  customer_name: string
  customer_email: string
  total: number
  status: string
  created_at: string
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/orders')
      .then((r) => r.json())
      .then((d) => setOrders(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminPageShell title="Orders">
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-400">No orders yet.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3 px-4 text-gray-400">ID</th>
                <th className="text-left py-3 px-4 text-gray-400">Customer</th>
                <th className="text-left py-3 px-4 text-gray-400">Total</th>
                <th className="text-left py-3 px-4 text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-dark-700">
                  <td className="py-3 px-4 text-white text-sm">{o.id}</td>
                  <td className="py-3 px-4 text-gray-300">{o.customer_name}</td>
                  <td className="py-3 px-4 text-white">€ {Number(o.total).toFixed(2)}</td>
                  <td className="py-3 px-4 text-gray-300 capitalize">{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageShell>
  )
}
