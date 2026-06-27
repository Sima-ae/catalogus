'use client'

import { Suspense, useEffect, useState } from 'react'
import { CatalogModeProvider } from '@/lib/catalog-mode-context'
import { ProductCardDisplayProvider } from '@/lib/product-card-display-context'
import { CartProvider } from '@/lib/cart'
import { ShopCurrencyProvider } from '@/lib/shop-currency-context'
import SiteAccessGuard from '@/components/site-access/SiteAccessGuard'
import { LanguagePickerProvider } from '@/lib/language-picker-context'
import LanguageSwitcherModal from '@/components/i18n/LanguageSwitcherModal'
import { I18nProvider } from '@/lib/i18n-context'
import ChatProvider from '@/components/chat/ChatProvider'
import ChatWidget from '@/components/chat/ChatWidget'
import ChatPanel from '@/components/chat/ChatPanel'
import { appPath } from '@/lib/paths'
import {
  getDefaultShopBootstrap,
  type LayoutBootstrapData,
  type ShopBootstrap,
} from '@/lib/shop-bootstrap-shared'
import { TickerMessagesProvider } from '@/lib/ticker-messages-context'
import type { Locale } from '@/lib/i18n'

type Props = {
  locale: Locale
  initialData: LayoutBootstrapData
  loadingText: string
  children: React.ReactNode
}

const RETRY_MS = 1500
const MAX_RETRIES = 12

function BootstrapLoading({ text }: { text: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-dark-900 text-gray-400 px-4">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      <p className="text-sm text-center">{text}</p>
    </div>
  )
}

export default function LayoutBootstrapGate({
  locale,
  initialData,
  loadingText,
  children,
}: Props) {
  const [categoryMessages, setCategoryMessages] = useState(initialData.categoryMessages)
  const [tagMessages, setTagMessages] = useState(initialData.tagMessages)
  const [shopBootstrap, setShopBootstrap] = useState<ShopBootstrap>(initialData.shopBootstrap)
  const [tickerMessages, setTickerMessages] = useState(initialData.tickerMessages)
  const [recovering, setRecovering] = useState(initialData.bootstrapDegraded)

  useEffect(() => {
    if (!initialData.bootstrapDegraded) return

    let cancelled = false
    let attempt = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const tryRecover = async () => {
      attempt += 1
      try {
        const res = await fetch(
          appPath(`/api/shop/bootstrap?locale=${encodeURIComponent(locale)}`),
          { cache: 'no-store' }
        )
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Bootstrap unavailable')

        if (cancelled) return
        setCategoryMessages(
          data.categoryMessages && typeof data.categoryMessages === 'object'
            ? data.categoryMessages
            : {}
        )
        setTagMessages(
          data.tagMessages && typeof data.tagMessages === 'object' ? data.tagMessages : {}
        )
        setShopBootstrap(data.bootstrap ?? getDefaultShopBootstrap(locale))
        setTickerMessages(Array.isArray(data.tickerMessages) ? data.tickerMessages : [])
        setRecovering(false)
        return
      } catch {
        if (cancelled) return
        if (attempt >= MAX_RETRIES) {
          setShopBootstrap(getDefaultShopBootstrap(locale))
          setRecovering(false)
          return
        }
        timer = setTimeout(() => void tryRecover(), RETRY_MS)
      }
    }

    void tryRecover()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [initialData.bootstrapDegraded, locale])

  if (recovering) {
    return <BootstrapLoading text={loadingText} />
  }

  return (
    <TickerMessagesProvider initialMessages={tickerMessages}>
      <I18nProvider
        initialLocale={locale}
        categoryMessages={categoryMessages}
        tagMessages={tagMessages}
      >
      <Suspense fallback={<BootstrapLoading text={loadingText} />}>
        <SiteAccessGuard>
          <LanguagePickerProvider>
            <CatalogModeProvider initialCatalogMode={shopBootstrap.catalogMode}>
              <ProductCardDisplayProvider
                initialShowCardDetails={shopBootstrap.showCardDetails}
              >
                <CartProvider>
                  <ShopCurrencyProvider initialCurrency={shopBootstrap.currency}>
                    <ChatProvider>
                      {children}
                      <ChatPanel />
                      <ChatWidget />
                    </ChatProvider>
                  </ShopCurrencyProvider>
                </CartProvider>
              </ProductCardDisplayProvider>
            </CatalogModeProvider>
            <Suspense fallback={null}>
              <LanguageSwitcherModal />
            </Suspense>
          </LanguagePickerProvider>
        </SiteAccessGuard>
      </Suspense>
      </I18nProvider>
    </TickerMessagesProvider>
  )
}
