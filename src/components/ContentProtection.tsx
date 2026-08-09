'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-local'
import { APP_COPYRIGHT, FEATURED_APP_COPYRIGHT } from '@/lib/brand'
import { useSiteBrand } from '@/lib/site-brand-context'
import { useI18n } from '@/lib/i18n-context'

type MenuState = {
  x: number
  y: number
  /** When set, show “Open in new tab” for this URL (product/link). */
  href: string | null
}

function isFormField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return !!target.closest('input, textarea, select, [contenteditable="true"]')
}

function resolveOpenableHref(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null
  const anchor = target.closest('a[href]') as HTMLAnchorElement | null
  if (!anchor) return null
  const href = String(anchor.getAttribute('href') || '').trim()
  if (!href || href === '#' || href.startsWith('javascript:')) return null
  try {
    return new URL(href, window.location.href).href
  } catch {
    return null
  }
}

/**
 * Logged-in admin / super admin: native browser menu + no copy blocks.
 * Guests: custom “Open in new tab” menu; no save-image / copy text.
 */
function useProtectionActive(): boolean {
  const { user, isAdmin, loading } = useAuth()
  if (loading) return true
  return !(user && isAdmin)
}

export default function ContentProtection() {
  const { t } = useI18n()
  const protectionActive = useProtectionActive()
  const brand = useSiteBrand()
  const copyright =
    brand.footerCopyright.trim() ||
    (brand.storeMode === 'featured' ? FEATURED_APP_COPYRIGHT : APP_COPYRIGHT)
  const [menu, setMenu] = useState<MenuState | null>(null)

  const closeMenu = useCallback(() => setMenu(null), [])

  useEffect(() => {
    document.body.classList.toggle('app-protected', protectionActive)
    return () => {
      document.body.classList.remove('app-protected')
    }
  }, [protectionActive])

  useEffect(() => {
    if (!protectionActive) {
      setMenu(null)
      return
    }

    const onContextMenu = (e: MouseEvent) => {
      // Allow native menu in form fields (paste, spellcheck, etc.).
      if (isFormField(e.target)) return

      const openHref = resolveOpenableHref(e.target)
      // Block native menu (Save image / Copy) — offer Open in new tab for links.
      e.preventDefault()

      const pad = 8
      const menuW = openHref ? 220 : 200
      const menuH = openHref ? 72 : 40
      const maxX = typeof window !== 'undefined' ? window.innerWidth - menuW : e.clientX
      const maxY = typeof window !== 'undefined' ? window.innerHeight - menuH : e.clientY
      setMenu({
        x: Math.min(e.clientX, Math.max(pad, maxX - pad)),
        y: Math.min(e.clientY, Math.max(pad, maxY - pad)),
        href: openHref,
      })
    }

    const blockCopy = (e: Event) => {
      if (isFormField(e.target)) return
      e.preventDefault()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (isFormField(e.target)) return
      const key = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'a', 'u', 's', 'p'].includes(key)) {
        e.preventDefault()
      }
    }

    const onClick = () => closeMenu()

    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('copy', blockCopy)
    document.addEventListener('cut', blockCopy)
    document.addEventListener('selectstart', blockCopy)
    document.addEventListener('dragstart', blockCopy)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('click', onClick)
    document.addEventListener('scroll', closeMenu, true)

    return () => {
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('copy', blockCopy)
      document.removeEventListener('cut', blockCopy)
      document.removeEventListener('selectstart', blockCopy)
      document.removeEventListener('dragstart', blockCopy)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('click', onClick)
      document.removeEventListener('scroll', closeMenu, true)
    }
  }, [closeMenu, protectionActive])

  const openInNewTabLabel = t('protection.openInNewTab')

  return (
    <>
      {menu && (
        <div
          className="fixed z-[10000] min-w-[11rem] rounded-md shadow-lg border border-neutral-700 bg-black text-white text-sm font-medium select-none overflow-hidden"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
          onContextMenu={(e) => e.preventDefault()}
        >
          {menu.href ? (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-4 py-2 text-left hover:bg-neutral-800 transition-colors"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const href = menu.href
                closeMenu()
                if (href) window.open(href, '_blank', 'noopener,noreferrer')
              }}
            >
              {openInNewTabLabel}
            </button>
          ) : null}
          <div
            className={`px-4 py-2 text-xs text-neutral-300 whitespace-nowrap pointer-events-none ${
              menu.href ? 'border-t border-neutral-700' : ''
            }`}
            role="status"
            aria-live="polite"
          >
            {copyright}
          </div>
        </div>
      )}
    </>
  )
}
