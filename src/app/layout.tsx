import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/lib/cart'
import { ThemeProvider } from '@/lib/theme'
import { AuthProvider } from '@/lib/auth-local'
import { appUrl } from '@/lib/paths'
import { APP_NAME } from '@/lib/brand'
import SiteAccessGuard from '@/components/site-access/SiteAccessGuard'
import ContentProtection from '@/components/ContentProtection'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: `${APP_NAME} - Digital Marketplace`,
  description: 'Digital marketplace for web templates, applications, and digital assets',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} app-protected transition-colors duration-200`}>
        <ContentProtection />
        <AuthProvider>
          <SiteAccessGuard>
            <ThemeProvider>
              <CartProvider>
                {children}
              </CartProvider>
            </ThemeProvider>
          </SiteAccessGuard>
        </AuthProvider>
      </body>
    </html>
  )
}
