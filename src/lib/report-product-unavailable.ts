/**
 * Fire-and-forget: tell the server a product image failed / is blank so the
 * product can be re-checked and marked sold out when the source is gone.
 *
 * Debounced: a single onError must not race a still-loading image into an OOS mark.
 * Blank cards (no image URL) report sooner — they already failed the shop filter intent.
 */
import { appPath } from '@/lib/paths'

const reported = new Set<string>()
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()

/** Wait before telling the server — slow CDN / first-paint errors are common. */
const CONFIRM_DELAY_MS = 4_000
/** Blank image_url cards are already broken — report faster. */
const BLANK_CONFIRM_DELAY_MS = 500

export function reportProductSourceUnavailable(
  productId: string,
  options?: { blank?: boolean }
): void {
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

  const delay = options?.blank ? BLANK_CONFIRM_DELAY_MS : CONFIRM_DELAY_MS
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
  }, delay)

  pendingTimers.set(id, timer)
}
