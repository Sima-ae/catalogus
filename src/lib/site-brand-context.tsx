'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { ShopBootstrap } from '@/lib/shop-bootstrap-shared'
import {
  APP_LOGO_PATH,
  APP_LOGO_PATH_WHITE,
  APP_LOGO_PATH_WHITE_CENTERED,
  APP_NAME,
} from '@/lib/brand'
import { formatFooterCopyright } from '@/lib/featured-brand-shared'

export type SiteBrandValue = {
  siteName: string
  siteTagline: string
  footerMenu: string
  footerCopyright: string
  logoPath: string
  logoPathWhite: string
  logoPathWhiteCentered: string
  storeMode: 'default' | 'featured'
}

const SiteBrandContext = createContext<SiteBrandValue | null>(null)

export function SiteBrandProvider({
  bootstrap,
  storeMode = 'default',
  children,
}: {
  bootstrap: ShopBootstrap
  storeMode?: 'default' | 'featured'
  children: ReactNode
}) {
  const value = useMemo<SiteBrandValue>(() => {
    const year = new Date().getFullYear()
    const logoPath = bootstrap.logo_path?.trim() || ''
    const logoPathWhite = bootstrap.logo_path_white?.trim() || logoPath
    const hasCustomLogo = Boolean(logoPath || logoPathWhite)
    return {
      siteName: bootstrap.site_name?.trim() || APP_NAME,
      siteTagline: bootstrap.site_tagline?.trim() || '',
      footerMenu: bootstrap.footer_menu?.trim() || '',
      footerCopyright: formatFooterCopyright(bootstrap.footer_copyright || '', year),
      logoPath: logoPath || APP_LOGO_PATH,
      logoPathWhite: logoPathWhite || APP_LOGO_PATH_WHITE,
      // Featured custom logos rarely have a "centered" variant — reuse white/default.
      logoPathWhiteCentered:
        storeMode === 'featured' && hasCustomLogo
          ? logoPathWhite || logoPath
          : APP_LOGO_PATH_WHITE_CENTERED,
      storeMode,
    }
  }, [bootstrap, storeMode])

  return <SiteBrandContext.Provider value={value}>{children}</SiteBrandContext.Provider>
}

export function useSiteBrand(): SiteBrandValue {
  const ctx = useContext(SiteBrandContext)
  if (ctx) return ctx
  return {
    siteName: APP_NAME,
    siteTagline: '',
    footerMenu: '',
    footerCopyright: '',
    logoPath: APP_LOGO_PATH,
    logoPathWhite: APP_LOGO_PATH_WHITE,
    logoPathWhiteCentered: APP_LOGO_PATH_WHITE_CENTERED,
    storeMode: 'default',
  }
}
