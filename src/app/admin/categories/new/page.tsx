'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AdminPageShell from '@/components/admin/AdminPageShell'
import CategoryForm from '@/components/admin/CategoryForm'
import { slugifyCategory } from '@/lib/category-slug'

function NewCategoryForm() {
  const searchParams = useSearchParams()
  const presetName = searchParams.get('name')?.trim() || ''

  return (
    <CategoryForm
      key={presetName || 'new'}
      initialName={presetName}
      initialSlug={presetName ? slugifyCategory(presetName) : ''}
    />
  )
}

export default function NewCategoryPage() {
  return (
    <AdminPageShell title="Add category" description="Create a product category">
      <Suspense fallback={<p className="text-gray-600 dark:text-gray-400">Loading...</p>}>
        <NewCategoryForm />
      </Suspense>
    </AdminPageShell>
  )
}
