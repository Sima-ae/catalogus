'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import AdminPageShell from '@/components/admin/AdminPageShell'
import type { Product } from '@/lib/types'
import { appPath } from '@/lib/paths'

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const loadProducts = () => {
    setLoading(true)
    fetch(appPath('/api/products'))
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return
    const res = await fetch(appPath(`/api/products/${id}`), { method: 'DELETE' })
    if (res.ok) loadProducts()
  }

  return (
    <AdminPageShell title="Products">
      <div className="flex justify-end mb-4">
        <Link href="/admin/products/new" className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add product
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : products.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="mb-4">No products yet.</p>
          <Link href="/admin/products/new" className="btn-primary inline-flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Add your first product
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3 px-4 text-gray-400">Product</th>
                <th className="text-left py-3 px-4 text-gray-400">Category</th>
                <th className="text-left py-3 px-4 text-gray-400">Price</th>
                <th className="text-left py-3 px-4 text-gray-400">Status</th>
                <th className="text-right py-3 px-4 text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-dark-700">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image_url}
                        alt=""
                        className="w-10 h-10 rounded object-cover"
                      />
                      <span className="text-white">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-300">{p.category}</td>
                  <td className="py-3 px-4 text-white">€ {Number(p.price).toFixed(2)}</td>
                  <td className="py-3 px-4 text-gray-300 capitalize">{p.status || 'active'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        className="p-2 rounded-lg hover:bg-dark-700 text-gray-400 hover:text-white"
                        title="Edit"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="p-2 rounded-lg hover:bg-dark-700 text-red-400 hover:text-red-300"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
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
