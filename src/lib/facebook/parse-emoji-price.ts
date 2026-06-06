/** Parse keycap emoji digits (e.g. 4️⃣5️⃣0️⃣ → 450). */
export function parseEmojiPriceHint(text: string): number | null {
  const raw = String(text ?? '')
  if (!raw.trim()) return null

  const keycapDigits: string[] = []
  const keycapRe = /\d\uFE0F?\u20E3/g
  let keycapMatch: RegExpExecArray | null
  while ((keycapMatch = keycapRe.exec(raw)) !== null) {
    keycapDigits.push(keycapMatch[0][0]!)
  }
  if (keycapDigits.length >= 2) {
    const value = parseInt(keycapDigits.join(''), 10)
    if (Number.isFinite(value) && value > 0) return value
  }

  const currencyMatch =
    raw.match(/(?:€|EUR|\$|USD|£|GBP)\s*(\d[\d.,]{0,8})/i) ||
    raw.match(/(\d[\d.,]{1,8})\s*(?:€|EUR|\$|USD|£|GBP)/i)
  if (currencyMatch?.[1]) {
    const normalized = currencyMatch[1].replace(/,/g, '').replace(/\.(?=.*\.)/g, '')
    const value = parseFloat(normalized)
    if (Number.isFinite(value) && value > 0) return Math.round(value)
  }

  return null
}
