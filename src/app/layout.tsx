import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/lib/cart'
import { ThemeProvider } from '@/lib/theme'
import { AuthProvider } from '@/lib/auth-local'
import { appUrl } from '@/lib/paths'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: 'TripleZero iT - Digital Marketplace',
  description: 'Digital marketplace for web templates, applications, and digital assets',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900 transition-colors duration-200`}>
        <AuthProvider>
          <ThemeProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
