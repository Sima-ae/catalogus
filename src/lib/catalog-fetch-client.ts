const DEFAULT_CATALOG_FETCH_TIMEOUT_MS = 90_000

/** Fetch catalog JSON with an abort timeout so loading UI cannot hang forever. */
export async function fetchCatalogJson(
  url: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<unknown> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_CATALOG_FETCH_TIMEOUT_MS
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  const onExternalAbort = () => controller.abort()
  if (options?.signal) {
    if (options.signal.aborted) {
      window.clearTimeout(timeoutId)
      throw new DOMException('Aborted', 'AbortError')
    }
    options.signal.addEventListener('abort', onExternalAbort, { once: true })
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out while loading products. Please try again.')
    }
    throw err
  } finally {
    window.clearTimeout(timeoutId)
    options?.signal?.removeEventListener('abort', onExternalAbort)
  }
}
