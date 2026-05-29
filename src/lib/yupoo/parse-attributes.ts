/** Expand "39-44" or "39~44" into individual sizes. */
export function expandSizeRange(part: string): string[] {
  const trimmed = part.trim()
  const range = trimmed.match(/^(\d+(?:\.\d+)?)\s*[-~–—]\s*(\d+(?:\.\d+)?)$/)
  if (!range) return trimmed ? [trimmed] : []

  const start = Math.round(parseFloat(range[1]!))
  const end = Math.round(parseFloat(range[2]!))
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > 30) {
    return [trimmed]
  }

  const sizes: string[] = []
  for (let i = start; i <= end; i++) sizes.push(String(i))
  return sizes
}

function parseSizeToken(raw: string): string[] {
  const parts = raw.split(/[|｜/、,，\s]+/).filter(Boolean)
  const out: string[] = []
  for (const part of parts) {
    for (const size of expandSizeRange(part)) {
      if (size && !out.includes(size)) out.push(size)
    }
  }
  return out
}

/** Parse sizes from description e.g. size：39-44 */
export function parseSizesFromText(text: string): string | null {
  const patterns = [
    /size\s*[：:]\s*([^\n\r]+)/i,
    /sizes\s*[：:]\s*([^\n\r]+)/i,
    /尺码\s*[：:]\s*([^\n\r]+)/,
    /码数\s*[：:]\s*([^\n\r]+)/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match?.[1]) continue
    const sizes = parseSizeToken(match[1].replace(/\s+/g, ' ').trim())
    if (sizes.length) return sizes.join('|')
  }

  return null
}

/** Parse colors from description. */
export function parseColorsFromText(text: string): string | null {
  const patterns = [
    /colou?r\s*[：:]\s*([^\n\r]+)/i,
    /颜色\s*[：:]\s*([^\n\r]+)/,
    /配色\s*[：:]\s*([^\n\r]+)/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match?.[1]) continue
    const colors = match[1]
      .split(/[|｜/、,，\s]+/)
      .map((c) => c.trim())
      .filter(Boolean)
    if (colors.length) return colors.join('|')
  }

  return null
}

export function parseAttributes(text: string): { sizes: string | null; colors: string | null } {
  return {
    sizes: parseSizesFromText(text),
    colors: parseColorsFromText(text),
  }
}
