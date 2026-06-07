import { appPath, appUrl } from '@/lib/paths'

/** Browser upload target — localhost dev sends files straight to production VPS. */
export function productImageUploadEndpoint(): string {
  if (typeof window === 'undefined') {
    return appPath('/api/product-images/upload')
  }

  const host = window.location.hostname
  const isLocalDev = host === 'localhost' || host === '127.0.0.1'
  if (isLocalDev) {
    return appUrl('/api/product-images/upload')
  }

  return appPath('/api/product-images/upload')
}

export function uploadAbortSignal(timeoutMs = 120_000): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }
  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}
