/** Parse JSON from a fetch Response without throwing on empty bodies. */
export async function parseJsonResponse<T = Record<string, unknown>>(
  res: Response
): Promise<T> {
  const text = await res.text()
  if (!text.trim()) {
    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`)
    }
    return {} as T
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(
      res.ok
        ? 'Invalid response from server'
        : `Request failed (${res.status})`
    )
  }
}
