import bcrypt from 'bcryptjs'
import { isDevFallbackEnabled } from '@/lib/runtime'

/** Dev-only login when MariaDB is not reachable (AUTH_DEV_FALLBACK=true). */
const DEV_USERS = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'info@000.it.com',
    role: 'admin' as const,
    name: 'Super Admin',
    password_hashes: [
      '$2b$12$iz2gPv3bl4I5lOQvYXFib.SLiOiXnqYAU8PV3rRJdhzo1p837TWqq',
      '$2b$12$ue2o4T2MAp5vd92OehduqO4bc4AR0vXSfmwX4Do268K9p5YLOeTjy',
    ],
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    email: 'buyer@test.com',
    role: 'buyer' as const,
    name: 'Test Buyer',
    password_hashes: ['$2b$12$Hz1zX52TvRzAgcl/jBhwguLsrFoyA5/eg5T7MAuRyj61mBbTzpxpq'],
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    email: 'seller@test.com',
    role: 'seller' as const,
    name: 'Test Seller',
    password_hashes: ['$2b$12$D8NEOUOYWISKCzCUdcgMWewE6TCvgSStTZo1QKhSBjsY4wGwCS6iK'],
  },
]

export function isDevAuthEnabled() {
  return isDevFallbackEnabled()
}

async function passwordMatches(hashes: string[], password: string) {
  for (const hash of hashes) {
    if (await bcrypt.compare(password, hash)) return true
  }
  return false
}

export async function tryDevLogin(email: string, password: string) {
  if (!isDevAuthEnabled()) return null

  const normalized = email.trim().toLowerCase()
  const user = DEV_USERS.find((u) => u.email === normalized)
  if (!user) return null

  const valid = await passwordMatches(user.password_hashes, password)
  if (!valid) return null

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  }
}
