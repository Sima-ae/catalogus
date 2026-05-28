import { clampBadgeRating } from '@/lib/user-roles'

const ratings = new Map<string, number | null>()

export function getDevBadgeRating(userId: string): number | null {
  return ratings.has(userId) ? (ratings.get(userId) ?? null) : null
}

export function setDevBadgeRating(userId: string, rating: number | null) {
  const clamped = rating === null ? null : clampBadgeRating(rating)
  ratings.set(userId, clamped)
}
