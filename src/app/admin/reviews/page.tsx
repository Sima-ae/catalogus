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
import { appPath } from '@/lib/paths'
import type { ReviewRow } from '@/app/api/reviews/route'

export default function AdminReviewsPage() {
  const t = useAppTheme()
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(appPath('/api/reviews'))
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Failed to load reviews')
        setReviews(Array.isArray(d) ? d : [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminPageShell title="Reviews">
      {loading && <p className={t.muted}>Loading...</p>}
      {error && <p className="text-red-500 dark:text-red-400">{error}</p>}
      {!loading && !error && reviews.length === 0 && (
        <AdminEmptyState
          title="No reviews yet"
          description="Reviews will appear here when customers submit them on product pages."
        />
      )}
      {!loading && !error && reviews.length > 0 && (
        <AdminTable>
          <AdminTableHead>
            <AdminTh>Product</AdminTh>
            <AdminTh>Customer</AdminTh>
            <AdminTh>Rating</AdminTh>
            <AdminTh>Title</AdminTh>
            <AdminTh>Status</AdminTh>
            <AdminTh>Date</AdminTh>
          </AdminTableHead>
          <AdminTableBody>
            {reviews.map((r) => (
              <AdminTr key={r.id}>
                <AdminTd>{r.product_name || r.product_id}</AdminTd>
                <AdminTd>{r.user_name}</AdminTd>
                <AdminTd>{r.rating}/5</AdminTd>
                <AdminTd className="max-w-xs truncate">{r.title || '—'}</AdminTd>
                <AdminTd className="capitalize">{r.status || 'pending'}</AdminTd>
                <AdminTd className="text-sm">{new Date(r.created_at).toLocaleDateString()}</AdminTd>
              </AdminTr>
            ))}
          </AdminTableBody>
        </AdminTable>
      )}
    </AdminPageShell>
  )
}
