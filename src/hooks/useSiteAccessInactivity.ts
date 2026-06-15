'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { appPath } from '@/lib/paths'
import {
  SITE_ACCESS_ACTIVITY_EVENTS,
  SITE_ACCESS_INACTIVITY_MS,
} from '@/lib/site-access-inactivity'

export function useSiteAccessInactivity(
  enabled: boolean,
  options?: { onLock?: () => void }
) {
  const [inactivityLocked, setInactivityLocked] = useState(false)
  const lastActivityRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lockingRef = useRef(false)

  const onLockRef = useRef(options?.onLock)
  onLockRef.current = options?.onLock

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const scheduleTimer = useCallback(() => {
    clearTimer()
    if (!enabled || inactivityLocked) return
    timerRef.current = setTimeout(() => {
      void (async () => {
        if (lockingRef.current || inactivityLocked) return
        const idleFor = Date.now() - lastActivityRef.current
        if (idleFor < SITE_ACCESS_INACTIVITY_MS - 500) {
          scheduleTimer()
          return
        }
        lockingRef.current = true
        try {
          await fetch(appPath('/api/site-access/lock'), {
            method: 'POST',
            credentials: 'include',
          })
          setInactivityLocked(true)
          onLockRef.current?.()
        } catch {
          scheduleTimer()
        } finally {
          lockingRef.current = false
        }
      })()
    }, SITE_ACCESS_INACTIVITY_MS)
  }, [clearTimer, enabled, inactivityLocked])

  const recordActivity = useCallback(() => {
    if (!enabled || inactivityLocked) return
    lastActivityRef.current = Date.now()
    scheduleTimer()
  }, [enabled, inactivityLocked, scheduleTimer])

  const resumeAfterUnlock = useCallback(() => {
    setInactivityLocked(false)
    lastActivityRef.current = Date.now()
  }, [])

  useEffect(() => {
    if (!enabled) {
      clearTimer()
      return
    }

    scheduleTimer()

    for (const evt of SITE_ACCESS_ACTIVITY_EVENTS) {
      window.addEventListener(evt, recordActivity, { passive: true })
    }

    return () => {
      clearTimer()
      for (const evt of SITE_ACCESS_ACTIVITY_EVENTS) {
        window.removeEventListener(evt, recordActivity)
      }
    }
  }, [clearTimer, enabled, inactivityLocked, recordActivity, scheduleTimer])

  useEffect(() => {
    if (!inactivityLocked) return

    const scrollY = window.scrollY
    const { style } = document.body
    const prevPosition = style.position
    const prevTop = style.top
    const prevWidth = style.width
    const prevOverflow = style.overflow

    style.position = 'fixed'
    style.top = `-${scrollY}px`
    style.width = '100%'
    style.overflow = 'hidden'

    return () => {
      style.position = prevPosition
      style.top = prevTop
      style.width = prevWidth
      style.overflow = prevOverflow
      window.scrollTo(0, scrollY)
    }
  }, [inactivityLocked])

  return { inactivityLocked, resumeAfterUnlock }
}
