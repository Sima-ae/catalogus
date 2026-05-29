'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AdminPageShell from '@/components/admin/AdminPageShell'
import BrandForm from '@/components/admin/BrandForm'
import { slugifyCategory } from '@/lib/category-slug'

function NewBrandForm() {
  const searchParams = useSearchParams()
  const presetName = searchParams.get('name')?.trim() || ''

  return (
    <BrandForm
      key={presetName || 'new'}
      initialName={presetName}
      initialSlug={presetName ? slugifyCategory(presetName) : ''}
    />
  )
}

export default function NewBrandPage() {
  return (
    <AdminPageShell title="Add brand" description="Create a product brand">
      <Suspense fallback={<p className="text-gray-600 dark:text-gray-400">Loading...</p>}>
        <NewBrandForm />
      </Suspense>
    </AdminPageShell>
  )
}
