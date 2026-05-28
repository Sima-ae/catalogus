'use client'

import { useCallback, useEffect, useState } from 'react'
import { APP_COPYRIGHT } from '@/lib/brand'

type MenuState = { x: number; y: number } | null

function isFormField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return !!target.closest('input, textarea, select, [contenteditable="true"]')
}

export default function ContentProtection() {
  const [menu, setMenu] = useState<MenuState>(null)

  const closeMenu = useCallback(() => setMenu(null), [])

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      const pad = 8
      const maxX = typeof window !== 'undefined' ? window.innerWidth - 220 : e.clientX
      const maxY = typeof window !== 'undefined' ? window.innerHeight - 48 : e.clientY
      setMenu({
        x: Math.min(e.clientX, maxX - pad),
        y: Math.min(e.clientY, maxY - pad),
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
  }, [closeMenu])

  return (
    <>
      {menu && (
        <div
          className="fixed z-[10000] px-4 py-2 rounded-md shadow-lg border border-neutral-700 bg-black text-white text-sm font-medium whitespace-nowrap pointer-events-none select-none"
          style={{ left: menu.x, top: menu.y }}
          role="status"
          aria-live="polite"
        >
          {APP_COPYRIGHT}
        </div>
      )}
    </>
  )
}
