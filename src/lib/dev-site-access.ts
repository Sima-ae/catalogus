import { DEFAULT_SITE_ACCESS } from '@/lib/site-access-keys'

let rows = [
  { key: 'site_access_enabled', value: DEFAULT_SITE_ACCESS.site_access_enabled },
  { key: 'site_access_password_hash', value: '' },
  { key: 'site_access_version', value: '0' },
]

export function getDevSiteAccessConfig() {
  return { rows: [...rows] }
}

export function setDevSiteAccessEnabled(enabled: boolean) {
  rows = rows.map((r) =>
    r.key === 'site_access_enabled'
      ? { ...r, value: enabled ? 'true' : 'false' }
      : r
  )
}

export function setDevSiteAccessPasswordHash(hash: string, bumpVersion = true) {
  const versionRow = rows.find((r) => r.key === 'site_access_version')
  const nextVersion = bumpVersion
    ? String(Number.parseInt(versionRow?.value || '0', 10) + 1)
    : versionRow?.value || '0'
  rows = [
    { key: 'site_access_enabled', value: 'true' },
    { key: 'site_access_password_hash', value: hash },
    { key: 'site_access_version', value: nextVersion },
  ]
}

export function clearDevSiteAccessPassword() {
  rows = [
    { key: 'site_access_enabled', value: 'false' },
    { key: 'site_access_password_hash', value: '' },
    { key: 'site_access_version', value: String(Number.parseInt(rows.find((r) => r.key === 'site_access_version')?.value || '0', 10) + 1) },
  ]
}
