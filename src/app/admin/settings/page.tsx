'use client'

import { useEffect, useState } from 'react'
import AdminPageShell from '@/components/admin/AdminPageShell'
import SiteAccessSettings from '@/components/admin/SiteAccessSettings'
import { appPath } from '@/lib/paths'
import type { SiteSettings } from '@/lib/site-settings'
import { DEFAULT_SITE_SETTINGS } from '@/lib/site-settings'
import { parseSettingsResponse } from '@/lib/parse-settings-response'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(appPath('/api/settings'))
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Failed to load settings')
        const parsed = parseSettingsResponse(d)
        setSettings(parsed.settings)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const updateField = (key: keyof SiteSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch(appPath('/api/settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save settings')
      const parsed = parseSettingsResponse(data)
      setSettings(parsed.settings)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPageShell
      title="Settings"
      description="Store branding and customer-facing options. Payment keys stay in server environment variables only."
    >
      <SiteAccessSettings />

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <form onSubmit={handleSubmit} className="card max-w-2xl space-y-6">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {saved && (
            <p className="text-primary-400 text-sm">
              Settings saved to database.
            </p>
          )}

          <div>
            <label htmlFor="site_name" className="block text-sm font-medium text-gray-300 mb-1">
              Site name
            </label>
            <input
              id="site_name"
              type="text"
              value={settings.site_name}
              onChange={(e) => updateField('site_name', e.target.value)}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
              required
            />
          </div>

          <div>
            <label htmlFor="site_tagline" className="block text-sm font-medium text-gray-300 mb-1">
              Tagline
            </label>
            <input
              id="site_tagline"
              type="text"
              value={settings.site_tagline}
              onChange={(e) => updateField('site_tagline', e.target.value)}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
            />
          </div>

          <div>
            <label htmlFor="support_email" className="block text-sm font-medium text-gray-300 mb-1">
              Support email
            </label>
            <input
              id="support_email"
              type="email"
              value={settings.support_email}
              onChange={(e) => updateField('support_email', e.target.value)}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
              placeholder="support@example.com"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-300 mb-1">
                Currency
              </label>
              <input
                id="currency"
                type="text"
                value={settings.currency}
                onChange={(e) => updateField('currency', e.target.value)}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
                maxLength={8}
              />
            </div>
            <div>
              <label htmlFor="tax_rate" className="block text-sm font-medium text-gray-300 mb-1">
                Tax rate (%)
              </label>
              <input
                id="tax_rate"
                type="text"
                inputMode="decimal"
                value={settings.tax_rate}
                onChange={(e) => updateField('tax_rate', e.target.value)}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
              />
            </div>
          </div>

          <p className="text-gray-500 text-xs">
            Stripe and database credentials are configured in <code className="text-gray-400">.env</code> on the
            server, not in this form.
          </p>

          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </form>
      )}
    </AdminPageShell>
  )
}
