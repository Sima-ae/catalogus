export const APP_NAME = 'Super Clones'
/** Browser tab icon, PWA / home-screen icon, apple-touch-icon. */
export const APP_ICON_PATH = '/WEBLOGO-centered.png'
export const APP_LOGO_PATH = '/WEBLOGO-TEXT-BLACK.png'
export const APP_LOGO_PATH_WHITE = '/WEBLOGO-TEXT-WHITE.png'
export const APP_LOGO_PATH_WHITE_CENTERED = '/WEBLOGO-TEXT-WHITE-CENTERED.png'
export const APP_LOGO_WATERMARK_PATH = '/WEBLOGO-TEXT-WHITE-TRANSPARENT.png'
/** @deprecated Use BrandLogo / APP_LOGO_PATH */
export const APP_LOGO_MARK = 'SC'
export const APP_COPYRIGHT = 'Super Clones © 2026'
export const APP_DEFAULT_AUTHOR = 'Super Clones'
export const APP_DEFAULT_AUTHOR_ICON = 'S'
/** Shown when a product has no version set (product page meta, etc.). */
export const APP_DEFAULT_PRODUCT_VERSION = APP_NAME

/** Product version label; empty / placeholder → Super Clones. */
export function resolveProductVersion(value: unknown): string {
  const v = String(value ?? '').trim()
  if (!v || v === '—' || v === '-') return APP_DEFAULT_PRODUCT_VERSION
  return v
}
export const CART_STORAGE_KEY = 'superclones-cart'
export const LEGACY_CART_STORAGE_KEY = 'triplezero-cart'
