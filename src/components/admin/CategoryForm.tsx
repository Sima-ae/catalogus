'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export default function CategoryForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onNameChange = (value: string) => {
    setName(value)
    if (!slugManual) setSlug(slugify(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, description }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Save failed')
        return
      }
      router.push('/admin/categories')
      router.refresh()
    } catch {
      setError('Network error — could not save category')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 max-w-xl">
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Name *</label>
        <input
          className="input w-full"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Slug *</label>
        <input
          className="input w-full"
          value={slug}
          onChange={(e) => {
            setSlugManual(true)
            setSlug(e.target.value)
          }}
          required
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Description</label>
        <textarea
          className="input w-full"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Create category'}
        </button>
        <Link href="/admin/categories" className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  )
}
