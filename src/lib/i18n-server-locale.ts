import { cookies, headers } from 'next/headers'
import { isLocale, LOCALE_COOKIE, type Locale } from '@/lib/i18n'
import { defaultLocaleForStoreMode } from '@/lib/i18n-locale-registry'
import { resolveRequestHostname, resolveStoreModeFromHost } from '@/lib/store-host'

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = cookies()
  const headerStore = headers()
  const fromPath = headerStore.get('x-catalogus-locale')
  const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value
  if (isLocale(fromPath)) return fromPath
  if (isLocale(rawLocale)) return rawLocale
  const hostname = resolveRequestHostname(headerStore)
  return defaultLocaleForStoreMode(resolveStoreModeFromHost(hostname))
}
