import { appPath } from '@/lib/paths'
import { localizedAppPath, parseLocaleFromPathname } from '@/lib/i18n-routing'

/** Where to send the user after site access unlock (never back to the gate). */
export function resolveSiteAccessRedirect(
  from: string | null | undefined,
  pathnameForLocale: string | null
): string {
  let path = (from ?? '').trim() || '/'
  if (!path.startsWith('/')) path = '/'
  if (path.includes('site-access-gate')) path = '/'

  const qIndex = path.indexOf('?')
  const pathname = qIndex === -1 ? path : path.slice(0, qIndex)
  const search = qIndex === -1 ? '' : path.slice(qIndex)

  const { locale } = parseLocaleFromPathname(pathname)
  const destination = locale
    ? pathname + search
    : localizedAppPath(pathnameForLocale, pathname) + search

  return appPath(destination)
}

export async function waitForSiteAccessUnlock(
  maxAttempts = 10,
  options?: { requireSession?: boolean }
): Promise<boolean> {
  const requireSession = options?.requireSession ?? false
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(appPath('/api/site-access/status'), {
        credentials: 'include',
        cache: 'no-store',
      })
      if (res.ok) {
        const data = (await res.json()) as {
          required?: boolean
          unlocked?: boolean
          sessionActive?: boolean
        }
        if (!data.required || !data.unlocked) {
          if (!data.required) return true
          continue
        }
        if (requireSession && !data.sessionActive) continue
        return true
      }
    } catch {
      /* retry */
    }
    if (i < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 80))
    }
  }
  return false
}

/** Full-page navigation so middleware and layout see the new unlock cookie. */
export function navigateAfterSiteAccessUnlock(destination: string): void {
  const path = destination.startsWith('/') ? destination : appPath(destination)
  const url = path.startsWith('http')
    ? path
    : `${window.location.origin}${path}`
  window.location.replace(url)
}
