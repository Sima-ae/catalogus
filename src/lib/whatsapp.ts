/**
 * Public WhatsApp contact for storefront CTAs (1-1.club full-catalog popup).
 *
 * Set either:
 *   NEXT_PUBLIC_WHATSAPP_NUMBER=31612345678   (digits, country code, no +)
 *   NEXT_PUBLIC_WHATSAPP_URL=https://wa.me/31612345678
 */
export function resolveWhatsAppContactUrl(prefillMessage?: string): string | null {
  const rawUrl = String(process.env.NEXT_PUBLIC_WHATSAPP_URL ?? '').trim()
  const rawNumber = String(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '')
    .trim()
    .replace(/[^\d]/g, '')

  let base = ''
  if (rawUrl) {
    base = rawUrl.replace(/\?.*$/, '')
  } else if (rawNumber) {
    base = `https://wa.me/${rawNumber}`
  } else {
    return null
  }

  const text = String(prefillMessage ?? '').trim()
  if (!text) return base
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}text=${encodeURIComponent(text)}`
}
