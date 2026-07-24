const DEFAULT_CATALOG_FETCH_TIMEOUT_MS = 60_000

const inflightCatalogFetches = new Map<string, Promise<unknown>>()

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  )
}

/** Fetch catalog JSON with timeout + in-flight dedupe so filter clicks cannot stampede the VPS. */
export async function fetchCatalogJson(
  url: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<unknown> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_CATALOG_FETCH_TIMEOUT_MS
  const external = options?.signal

  if (external?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  // Only dedupe quiet background fetches (no external abort). Filter navigations pass a
  // signal and must not share a promise that ignores their abort.
  if (!external) {
    const existing = inflightCatalogFetches.get(url)
    if (existing) return existing
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  const onExternalAbort = () => controller.abort()
  if (external) {
    external.addEventListener('abort', onExternalAbort, { once: true })
  }

  let request!: Promise<unknown>
  request = (async () => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (err) {
      if (isAbortError(err)) {
        if (external?.aborted) {
          throw new DOMException('Aborted', 'AbortError')
        }
        throw new Error('Request timed out while loading products. Please try again.')
      }
      throw err
    } finally {
      window.clearTimeout(timeoutId)
      external?.removeEventListener('abort', onExternalAbort)
      if (!external && inflightCatalogFetches.get(url) === request) {
        inflightCatalogFetches.delete(url)
      }
    }
  })()

  if (!external) {
    inflightCatalogFetches.set(url, request)
  }

  return request
}

export function isCatalogFetchAbortError(err: unknown): boolean {
  return isAbortError(err)
}
