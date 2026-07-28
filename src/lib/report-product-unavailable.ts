import { appPath } from '@/lib/paths'

const reported = new Set<string>()

/**
 * Fire-and-forget: tell the server a Yupoo image failed to load so the
 * product can be re-checked and marked sold out when the album is gone.
 */
export function reportProductSourceUnavailable(productId: string): void {
  const id = String(productId || '').trim()
  if (!id || typeof window === 'undefined') return
  if (reported.has(id)) return
  reported.add(id)

  try {
    const key = `oos-reported:${id}`
    if (sessionStorage.getItem(key) === '1') return
    sessionStorage.setItem(key, '1')
  } catch {
    // sessionStorage may be blocked
  }

  void fetch(appPath(`/api/products/${encodeURIComponent(id)}/report-unavailable`), {
    method: 'POST',
    headers: { Accept: 'application/json' },
    keepalive: true,
  }).catch(() => {
    // best-effort
  })
}
