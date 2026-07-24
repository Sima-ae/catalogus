import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/lib/theme'
import { AuthProvider } from '@/lib/auth-local'
import ContentProtection from '@/components/ContentProtection'
import LayoutBootstrapGate from '@/components/layout/LayoutBootstrapGate'
import { buildRootMetadata } from '@/lib/site-metadata'
import { getServerLocale } from '@/lib/i18n-server-locale'
import { cookies, headers } from 'next/headers'
import { DEFAULT_LOCALE, getMessages, isLocale, LOCALE_COOKIE, type Locale } from '@/lib/i18n'
import {
  getLightLayoutBootstrapData,
  loadLayoutBootstrapData,
} from '@/lib/shop-bootstrap'
import { CATALOGUS_LIGHT_HEADER } from '@/lib/bot-traffic'

const inter = Inter({ subsets: ['latin'] })

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return buildRootMetadata(locale)
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const headerStore = headers()
  const fromPath = headerStore.get('x-catalogus-locale')
  const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value
  const locale: Locale = isLocale(fromPath)
    ? fromPath
    : isLocale(rawLocale)
      ? rawLocale
      : DEFAULT_LOCALE
  const messages = getMessages(locale)
  const light = headerStore.get(CATALOGUS_LIGHT_HEADER) === '1'
  const layoutBootstrap = light
    ? getLightLayoutBootstrapData(locale)
    : await loadLayoutBootstrapData(locale)
  const preloadText = messages['loading.generic'] || 'Loading…'

  return (
    <html lang={locale}>
      <head>
        <meta
          name="robots"
          content="noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate"
        />
        <meta
          name="googlebot"
          content="noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate, max-image-preview:none, max-snippet:-1"
        />
      </head>
      <body className={`${inter.className} app-protected transition-colors duration-200`}>
        <AuthProvider>
          <ContentProtection />
          <ThemeProvider>
            <LayoutBootstrapGate
              locale={locale}
              initialData={layoutBootstrap}
              loadingText={preloadText}
            >
              {children}
            </LayoutBootstrapGate>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
