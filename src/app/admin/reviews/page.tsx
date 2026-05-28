'use client'

import { useEffect, useState } from 'react'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import { appPath } from '@/lib/paths'
import type { ReviewRow } from '@/app/api/reviews/route'

export default function AdminReviewsPage() {
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
    <AdminPageShell title="Reviews" description="Customer product reviews and ratings.">
      {loading && <p className="text-gray-400">Loading...</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && reviews.length === 0 && (
        <AdminEmptyState
          title="No reviews yet"
          description="Reviews will appear here when customers submit them on product pages."
        />
      )}
      {!loading && !error && reviews.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3 px-4 text-gray-400">Product</th>
                <th className="text-left py-3 px-4 text-gray-400">Customer</th>
                <th className="text-left py-3 px-4 text-gray-400">Rating</th>
                <th className="text-left py-3 px-4 text-gray-400">Title</th>
                <th className="text-left py-3 px-4 text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} className="border-b border-dark-700">
                  <td className="py-3 px-4 text-white">{r.product_name || r.product_id}</td>
                  <td className="py-3 px-4 text-gray-300">{r.user_name}</td>
                  <td className="py-3 px-4 text-white">{r.rating}/5</td>
                  <td className="py-3 px-4 text-gray-300 max-w-xs truncate">{r.title || '—'}</td>
                  <td className="py-3 px-4 text-gray-300 capitalize">{r.status || 'pending'}</td>
                  <td className="py-3 px-4 text-gray-400 text-sm">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageShell>
  )
}
