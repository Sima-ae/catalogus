const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 30

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

function prune() {
  const now = Date.now()
  buckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) buckets.delete(key)
  })
}

/** Simple in-memory throttle for site-access verify (per IP). */
export function checkSiteAccessVerifyRateLimit(clientKey: string): boolean {
  prune()
  const key = clientKey.trim() || 'unknown'
  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS }
    buckets.set(key, bucket)
  }
  bucket.count += 1
  return bucket.count <= MAX_ATTEMPTS
}
