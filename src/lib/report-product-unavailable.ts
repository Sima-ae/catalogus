/**
 * Fire-and-forget: tell the server a Yupoo image failed to load so the
 * product can be re-checked and marked sold out when the album is gone.
 *
 * Debounced: a single onError (or blank card before paint) must not race
 * a still-loading image into an OOS mark.
 */
import { appPath } from '@/lib/paths'

const reported = new Set<string>()
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()

/** Wait before telling the server — slow CDN / first-paint errors are common. */
const CONFIRM_DELAY_MS = 4_000

export function reportProductSourceUnavailable(productId: string): void {
  const id = String(productId || '').trim()
  if (!id || typeof window === 'undefined') return
  if (reported.has(id)) return

  try {
    const key = `oos-reported:${id}`
    if (sessionStorage.getItem(key) === '1') {
      reported.add(id)
      return
    }
  } catch {
    // sessionStorage may be blocked
  }

  if (pendingTimers.has(id)) return

  const timer = setTimeout(() => {
    pendingTimers.delete(id)
    if (reported.has(id)) return
    reported.add(id)

    try {
      sessionStorage.setItem(`oos-reported:${id}`, '1')
    } catch {
      // sessionStorage may be blocked
    }

    void fetch(appPath(`/api/products/${encodeURIComponent(id)}/report-unavailable`), {
      method: 'POST',
      headers: { Accept: 'application/json' },
      keepalive: true,
    }).catch(() => {
      // best-effort — allow a later retry if the request never left
      reported.delete(id)
      try {
        sessionStorage.removeItem(`oos-reported:${id}`)
      } catch {
        // ignore
      }
    })
  }, CONFIRM_DELAY_MS)

  pendingTimers.set(id, timer)
}
