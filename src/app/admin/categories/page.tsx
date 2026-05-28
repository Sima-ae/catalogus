'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlusIcon } from '@heroicons/react/24/outline'
import AdminPageShell from '@/components/admin/AdminPageShell'

type Category = {
  id: string
  name: string
  slug: string
  description?: string
  active?: number | boolean
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminPageShell title="Categories">
      <div className="flex justify-end mb-4">
        <Link href="/admin/categories/new" className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add category
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : categories.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="mb-4">No categories yet.</p>
          <Link href="/admin/categories/new" className="btn-primary inline-flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Add category
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3 px-4 text-gray-400">Name</th>
                <th className="text-left py-3 px-4 text-gray-400">Slug</th>
                <th className="text-left py-3 px-4 text-gray-400">Description</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-dark-700">
                  <td className="py-3 px-4 text-white">{c.name}</td>
                  <td className="py-3 px-4 text-gray-300">{c.slug}</td>
                  <td className="py-3 px-4 text-gray-300">{c.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageShell>
  )
}
