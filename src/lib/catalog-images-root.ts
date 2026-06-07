import fs from 'fs'
import path from 'path'

function resolveRoots(paths: string[]): string[] {
  return Array.from(new Set(paths.map((r) => path.resolve(r))))
}

function vpsPublicHtmlPath(): string | null {
  const publicHtml = process.env.CATALOGUS_PUBLIC_HTML?.trim()
  return publicHtml || null
}

/** All directories where catalog images may exist (read / delete). */
export function getCatalogImagesRoots(): string[] {
  const roots: string[] = []

  const publicHtml = vpsPublicHtmlPath()
  if (publicHtml) {
    roots.push(path.join(publicHtml, 'images'))
  }

  const imagesRoot = process.env.CATALOGUS_IMAGES_ROOT?.trim()
  if (imagesRoot) {
    roots.push(imagesRoot)
  }

  roots.push(path.join(process.cwd(), 'public', 'images'))

  return resolveRoots(roots)
}

/**
 * Where new uploads / imports are written.
 * Production (VPS): always public_html/images when CATALOGUS_PUBLIC_HTML is set.
 * Local Mac: public/images unless the VPS folder exists on disk.
 */
export function getCatalogImagesWriteRoots(): string[] {
  const roots: string[] = []
  const publicHtml = vpsPublicHtmlPath()
  const isProduction = process.env.NODE_ENV === 'production'

  if (publicHtml && (isProduction || fs.existsSync(publicHtml))) {
    roots.push(path.join(publicHtml, 'images'))
  }

  const imagesRoot = process.env.CATALOGUS_IMAGES_ROOT?.trim()
  if (imagesRoot) {
    roots.push(imagesRoot)
  }

  if (!publicHtml || !isProduction) {
    roots.push(path.join(process.cwd(), 'public', 'images'))
  }

  return resolveRoots(roots)
}

/** @deprecated Use isOffVpsDiskDevelopment — kept for import scripts. */
export function shouldWriteCatalogImagesViaSsh(): boolean {
  return isOffVpsDiskDevelopment()
}

/** True on a Mac/dev machine when files must go to the VPS (not local disk). */
export function isOffVpsDiskDevelopment(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  const publicHtml = vpsPublicHtmlPath()
  if (!publicHtml) return false
  return !fs.existsSync(publicHtml)
}

export function isCatalogImagesVpsWrite(): boolean {
  return Boolean(vpsPublicHtmlPath() || process.env.CATALOGUS_IMAGES_ROOT?.trim())
}

export function describeCatalogImagesWriteTarget(): string {
  const root = getCatalogImagesWriteRoots()[0] ?? ''
  if (isOffVpsDiskDevelopment()) {
    return `${process.env.NEXT_PUBLIC_APP_URL || 'https://superclones.cloud'}/api/product-images/upload (browser → VPS)`
  }
  if (isCatalogImagesVpsWrite()) {
    return root
  }
  return `${root} (local dev)`
}

/** Ensure import mirror folders exist on the VPS images root. */
export function catalogImportMirrorDirs(): string[] {
  return ['imports/facebook', 'imports/woocommerce', 'uploads']
}
