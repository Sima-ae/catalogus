import { formatMessage } from '@/lib/i18n'

export type ChatI18nPayload = {
  __chat_i18n: string
  params?: Record<string, string | null | undefined>
}

const I18N_PREFIX = '{"__chat_i18n"'

export function encodeChatI18nBody(
  key: string,
  params?: Record<string, string | null | undefined>
): string {
  return JSON.stringify({ __chat_i18n: key, params: params ?? {} } satisfies ChatI18nPayload)
}

export function isChatI18nBody(body: string | null | undefined): boolean {
  return Boolean(body?.trimStart().startsWith(I18N_PREFIX))
}

function tryParseI18nBody(body: string): ChatI18nPayload | null {
  try {
    const parsed = JSON.parse(body) as ChatI18nPayload
    if (typeof parsed?.__chat_i18n === 'string') return parsed
  } catch {
    // not JSON
  }
  return null
}

/** Localize stored chat message bodies (i18n JSON + legacy English templates). */
export function formatChatMessageBody(
  body: string | null | undefined,
  translate: (key: string) => string,
  values?: Record<string, string | number | null | undefined>
): string {
  const raw = String(body ?? '').trim()
  if (!raw) return ''

  const parsed = tryParseI18nBody(raw)
  if (parsed) {
    const params = { ...parsed.params, ...values }
    if (parsed.__chat_i18n === 'chat.system.forwardQuote') {
      const sku = String(params.sku ?? '').trim()
      const skuSuffix = sku
        ? formatMessage(translate('chat.system.forwardQuote.skuSuffix'), { sku })
        : ''
      return formatMessage(translate('chat.system.forwardQuote'), {
        productName: String(params.productName ?? ''),
        skuSuffix,
      })
    }
    return formatMessage(translate(parsed.__chat_i18n), params as Record<string, string>)
  }

  return localizeLegacyChatMessageBody(raw, translate)
}

function localizeLegacyChatMessageBody(raw: string, translate: (key: string) => string): string {
  const forwardMatch = raw.match(
    /^Admin forwarded a quote request for (.+?)\. Reply with your price\.$/
  )
  if (forwardMatch) {
    const label = forwardMatch[1] ?? ''
    const skuMatch = label.match(/^(.+?) \(SKU (.+)\)$/)
    if (skuMatch) {
      return formatMessage(translate('chat.system.forwardQuote'), {
        productName: skuMatch[1] ?? '',
        skuSuffix: formatMessage(translate('chat.system.forwardQuote.skuSuffix'), {
          sku: skuMatch[2] ?? '',
        }),
      })
    }
    return formatMessage(translate('chat.system.forwardQuote'), {
      productName: label,
      skuSuffix: '',
    })
  }

  const priceMatch = raw.match(/^Price for (.+?): (.+)$/)
  if (priceMatch) {
    return formatMessage(translate('chat.priceReply'), {
      label: priceMatch[1] ?? '',
      price: priceMatch[2] ?? '',
    })
  }

  return raw
}

export function formatChatQuoteStatus(status: string, translate: (key: string) => string): string {
  const key = `chat.status.${status}` as const
  const translated = translate(key)
  return translated !== key ? translated : status
}

export function formatChatProductLabel(
  input: { name: string; sku?: string | null },
  translate: (key: string) => string
): string {
  const name = input.name.trim()
  const sku = input.sku?.trim()
  if (sku) return formatMessage(translate('chat.productWithSku'), { name, sku })
  return name
}
