/** Idle time before the site password prompt reappears. */
export const SITE_ACCESS_INACTIVITY_MS = 10 * 60 * 1000

export const SITE_ACCESS_ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'click',
  'wheel',
] as const
