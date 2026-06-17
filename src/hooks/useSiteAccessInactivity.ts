'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { appPath } from '@/lib/paths'
import {
  SITE_ACCESS_ACTIVITY_EVENTS,
  SITE_ACCESS_INACTIVITY_MS,
} from '@/lib/site-access-inactivity'

const ACTIVITY_THROTTLE_MS = 1_000

export function useSiteAccessInactivity(
  enabled: boolean,
  options?: { onLock?: () => void }
) {
  const [inactivityLocked, setInactivityLocked] = useState(false)
  const lastActivityRef = useRef(Date.now())
  const lastRescheduleRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lockingRef = useRef(false)
  const lockedRef = useRef(false)
  const enabledRef = useRef(enabled)

  const onLockRef = useRef(options?.onLock)
  onLockRef.current = options?.onLock

  enabledRef.current = enabled
  lockedRef.current = inactivityLocked

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const scheduleTimerRef = useRef<() => void>(() => {})

  const lockSession = useCallback(async () => {
    if (lockingRef.current || lockedRef.current || !enabledRef.current) return

    const idleFor = Date.now() - lastActivityRef.current
    if (idleFor < SITE_ACCESS_INACTIVITY_MS - 500) {
      scheduleTimerRef.current()
      return
    }

    lockingRef.current = true
    lockedRef.current = true
    setInactivityLocked(true)

    try {
      await fetch(appPath('/api/site-access/lock'), {
        method: 'POST',
        credentials: 'include',
      })
      onLockRef.current?.()
    } catch {
      lockedRef.current = false
      setInactivityLocked(false)
      lastActivityRef.current = Date.now()
      scheduleTimerRef.current()
    } finally {
      lockingRef.current = false
    }
  }, [])

  const scheduleTimer = useCallback(() => {
    clearTimer()
    if (!enabledRef.current || lockedRef.current) return

    const idleFor = Date.now() - lastActivityRef.current
    const remaining = Math.max(250, SITE_ACCESS_INACTIVITY_MS - idleFor)

    timerRef.current = setTimeout(() => {
      void lockSession()
    }, remaining)
  }, [clearTimer, lockSession])

  scheduleTimerRef.current = scheduleTimer

  const recordActivity = useCallback(() => {
    if (!enabledRef.current || lockedRef.current) return

    const now = Date.now()
    lastActivityRef.current = now

    if (now - lastRescheduleRef.current < ACTIVITY_THROTTLE_MS) return
    lastRescheduleRef.current = now
    scheduleTimer()
  }, [scheduleTimer])

  const resumeAfterUnlock = useCallback(() => {
    lockedRef.current = false
    setInactivityLocked(false)
    lastActivityRef.current = Date.now()
    lastRescheduleRef.current = 0
    scheduleTimer()
  }, [scheduleTimer])

  useEffect(() => {
    if (!enabled) {
      clearTimer()
      return
    }

    lastActivityRef.current = Date.now()
    scheduleTimer()

    for (const evt of SITE_ACCESS_ACTIVITY_EVENTS) {
      window.addEventListener(evt, recordActivity, { passive: true })
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        clearTimer()
        return
      }

      const idleFor = Date.now() - lastActivityRef.current
      if (idleFor >= SITE_ACCESS_INACTIVITY_MS) {
        void lockSession()
        return
      }
      scheduleTimer()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearTimer()
      for (const evt of SITE_ACCESS_ACTIVITY_EVENTS) {
        window.removeEventListener(evt, recordActivity)
      }
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [clearTimer, enabled, lockSession, recordActivity, scheduleTimer])

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
