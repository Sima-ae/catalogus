import { cookies, headers } from 'next/headers'
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from '@/lib/i18n'

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = cookies()
  const headerStore = headers()
  const fromPath = headerStore.get('x-catalogus-locale')
  const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value
  if (isLocale(fromPath)) return fromPath
  if (isLocale(rawLocale)) return rawLocale
  return DEFAULT_LOCALE
}
