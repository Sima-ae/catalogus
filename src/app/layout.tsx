import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Inter } from 'next/font/google'
import './globals.css'
import { CatalogModeProvider } from '@/lib/catalog-mode-context'
import { ProductCardDisplayProvider } from '@/lib/product-card-display-context'
import { CartProvider } from '@/lib/cart'
import { ThemeProvider } from '@/lib/theme'
import { AuthProvider } from '@/lib/auth-local'
import { ShopCurrencyProvider } from '@/lib/shop-currency-context'
import SiteAccessGuard from '@/components/site-access/SiteAccessGuard'
import ContentProtection from '@/components/ContentProtection'
import { buildRootMetadata } from '@/lib/site-metadata'
import { cookies, headers } from 'next/headers'
import { I18nProvider } from '@/lib/i18n-context'
import { LanguagePickerProvider } from '@/lib/language-picker-context'
import LanguageSwitcherModal from '@/components/i18n/LanguageSwitcherModal'
import { DEFAULT_LOCALE, getMessages, isLocale, LOCALE_COOKIE } from '@/lib/i18n'

const inter = Inter({ subsets: ['latin'] })

export async function generateMetadata(): Promise<Metadata> {
  return buildRootMetadata()
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const headerStore = headers()
  const fromPath = headerStore.get('x-catalogus-locale')
  const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value
  const locale = isLocale(fromPath)
    ? fromPath
    : isLocale(rawLocale)
      ? rawLocale
      : DEFAULT_LOCALE
  const messages = getMessages(locale)
  const preloadText = messages['loading.generic'] || 'Loading…'

  return (
    <html lang={locale}>
      <body className={`${inter.className} app-protected transition-colors duration-200`}>
        <ContentProtection />
        <AuthProvider>
          <Suspense
            fallback={
              <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-dark-900 text-gray-400 px-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
                <p className="text-sm">{preloadText}</p>
              </div>
            }
          >
            <SiteAccessGuard>
              <ThemeProvider>
                <I18nProvider initialLocale={locale}>
                    <LanguagePickerProvider>
                      <CatalogModeProvider>
                        <ProductCardDisplayProvider>
                          <CartProvider>
                            <ShopCurrencyProvider>{children}</ShopCurrencyProvider>
                          </CartProvider>
                        </ProductCardDisplayProvider>
                      </CatalogModeProvider>
                      <Suspense fallback={null}>
                        <LanguageSwitcherModal />
                      </Suspense>
                    </LanguagePickerProvider>
                </I18nProvider>
              </ThemeProvider>
            </SiteAccessGuard>
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  )
}
