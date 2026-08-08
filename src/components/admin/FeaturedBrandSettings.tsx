'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { appPath } from '@/lib/paths'
import { useAppTheme } from '@/lib/theme-classes'
import {
  DEFAULT_FEATURED_BRAND_SETTINGS,
  type FeaturedBrandSettings as FeaturedBrandSettingsType,
} from '@/lib/featured-brand-shared'

type LogoVariant = 'default' | 'white'

export default function FeaturedBrandSettings() {
  const t = useAppTheme()
  const { user } = useAuth()
  const [settings, setSettings] = useState<FeaturedBrandSettingsType>(
    DEFAULT_FEATURED_BRAND_SETTINGS
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<LogoVariant | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const defaultFileRef = useRef<HTMLInputElement>(null)
  const whiteFileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(appPath('/api/admin/featured-brand'), {
        headers: adminAuthHeaders(user),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load 1-1.club branding')
      setSettings({
        ...DEFAULT_FEATURED_BRAND_SETTINGS,
        ...(data.settings && typeof data.settings === 'object' ? data.settings : {}),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load 1-1.club branding')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  const updateField = <K extends keyof FeaturedBrandSettingsType>(
    key: K,
    value: FeaturedBrandSettingsType[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch(appPath('/api/admin/featured-brand'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(user) },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save 1-1.club branding')
      setSettings({
        ...DEFAULT_FEATURED_BRAND_SETTINGS,
        ...(data.settings && typeof data.settings === 'object' ? data.settings : {}),
      })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save 1-1.club branding')
    } finally {
      setSaving(false)
    }
  }

  const uploadLogo = async (file: File, variant: LogoVariant) => {
    setUploading(variant)
    setError('')
    setSaved(false)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('variant', variant)
      const res = await fetch(appPath('/api/admin/featured-brand/logo'), {
        method: 'POST',
        headers: adminAuthHeaders(user),
        body,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Logo upload failed')
      if (data.settings && typeof data.settings === 'object') {
        setSettings({
          ...DEFAULT_FEATURED_BRAND_SETTINGS,
          ...data.settings,
        })
      }
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logo upload failed')
    } finally {
      setUploading(null)
    }
  }

  const onPickFile = (variant: LogoVariant) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    void uploadLogo(file, variant)
  }

  const clearLogo = (variant: LogoVariant) => {
    if (variant === 'white') updateField('featured_logo_path_white', '')
    else updateField('featured_logo_path', '')
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-2xl space-y-6">
      <div>
        <h2 className="card-section-title">Store settings — 1-1.club</h2>
        <p className={`mt-1 text-sm ${t.muted}`}>
          Branding for www.1-1.club only. Super Clones keeps its own store settings and logos.
        </p>
      </div>

      {loading ? (
        <p className={t.muted}>Loading...</p>
      ) : (
        <>
          {error ? <p className="text-red-600 dark:text-red-400 text-sm">{error}</p> : null}
          {saved ? (
            <p className="text-gray-900 dark:text-primary-400 text-sm font-medium">
              1-1.club branding saved.
            </p>
          ) : null}

          <div>
            <label htmlFor="featured_site_name" className="form-label">
              Site name
            </label>
            <input
              id="featured_site_name"
              type="text"
              value={settings.featured_site_name}
              onChange={(e) => updateField('featured_site_name', e.target.value)}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label htmlFor="featured_site_tagline" className="form-label">
              Tagline (optional)
            </label>
            <input
              id="featured_site_tagline"
              type="text"
              value={settings.featured_site_tagline}
              onChange={(e) => updateField('featured_site_tagline', e.target.value)}
              className="input w-full"
              placeholder="Shown in titles / SEO on 1-1.club"
            />
          </div>

          <div className="space-y-3">
            <p className="form-label mb-0">Logo</p>
            <p className={`text-xs ${t.muted}`}>
              Upload a dedicated logo for 1-1.club. Leave empty to fall back to the default Super
              Clones mark until you upload one. Optional white variant is used on dark backgrounds.
            </p>
            <LogoPreview
              label="Default logo"
              url={settings.featured_logo_path}
              uploading={uploading === 'default'}
              onUploadClick={() => defaultFileRef.current?.click()}
              onClear={() => clearLogo('default')}
              mutedClass={t.muted}
            />
            <input
              ref={defaultFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onPickFile('default')}
            />
            <LogoPreview
              label="White logo (optional)"
              url={settings.featured_logo_path_white}
              uploading={uploading === 'white'}
              onUploadClick={() => whiteFileRef.current?.click()}
              onClear={() => clearLogo('white')}
              mutedClass={t.muted}
              darkPreview
            />
            <input
              ref={whiteFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onPickFile('white')}
            />
          </div>

          <div>
            <label htmlFor="featured_footer_menu" className="form-label">
              Bottom menu / footer text
            </label>
            <textarea
              id="featured_footer_menu"
              value={settings.featured_footer_menu}
              onChange={(e) => updateField('featured_footer_menu', e.target.value)}
              className="input w-full min-h-[5.5rem]"
              rows={3}
              placeholder="Optional lines shown above the copyright on 1-1.club"
            />
            <p className={`mt-1 text-xs ${t.muted}`}>
              Plain text only. Use new lines for separate rows in the footer.
            </p>
          </div>

          <div>
            <label htmlFor="featured_footer_copyright" className="form-label">
              Page copyright text
            </label>
            <input
              id="featured_footer_copyright"
              type="text"
              value={settings.featured_footer_copyright}
              onChange={(e) => updateField('featured_footer_copyright', e.target.value)}
              className="input w-full"
              placeholder="1-1 Club © {year}"
            />
            <p className={`mt-1 text-xs ${t.muted}`}>
              Use <code className={t.body}>{'{year}'}</code> for the current year.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving || uploading !== null}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save 1-1.club settings'}
          </button>
        </>
      )}
    </form>
  )
}

function LogoPreview({
  label,
  url,
  uploading,
  onUploadClick,
  onClear,
  mutedClass,
  darkPreview = false,
}: {
  label: string
  url: string
  uploading: boolean
  onUploadClick: () => void
  onClear: () => void
  mutedClass: string
  darkPreview?: boolean
}) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-dark-700 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={uploading}
            onClick={onUploadClick}
          >
            {uploading ? 'Uploading...' : url ? 'Replace' : 'Upload'}
          </button>
          {url ? (
            <button type="button" className="btn-secondary text-sm" onClick={onClear}>
              Clear
            </button>
          ) : null}
        </div>
      </div>
      {url ? (
        <div
          className={`flex items-center justify-center rounded-md px-3 py-4 ${
            darkPreview ? 'bg-dark-900' : 'bg-gray-50 dark:bg-dark-800'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="max-h-14 w-auto object-contain" />
        </div>
      ) : (
        <p className={`text-xs ${mutedClass}`}>No custom logo uploaded.</p>
      )}
    </div>
  )
}
