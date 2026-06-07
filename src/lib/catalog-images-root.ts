import fs from 'fs'
import path from 'path'

function resolveRoots(paths: string[]): string[] {
  return Array.from(new Set(paths.map((r) => path.resolve(r))))
}

function dirExists(dir: string): boolean {
  try {
    return fs.existsSync(dir) && fs.statSync(dir).isDirectory()
  } catch {
    return false
  }
}

/** All directories where catalog images may exist (read / delete). */
export function getCatalogImagesRoots(): string[] {
  const roots: string[] = []

  const publicHtml = process.env.CATALOGUS_PUBLIC_HTML?.trim()
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
 * Directory for new writes (imports, uploads).
 * Prefers VPS public_html/images when that path exists on this machine.
 * Falls back to public/images (local dev when .env still has the VPS path).
 */
export function getCatalogImagesWriteRoots(): string[] {
  const roots: string[] = []

  const publicHtml = process.env.CATALOGUS_PUBLIC_HTML?.trim()
  if (publicHtml) {
    const vpsImages = path.join(publicHtml, 'images')
    if (dirExists(path.dirname(publicHtml)) || dirExists(vpsImages)) {
      roots.push(vpsImages)
    }
  }

  const imagesRoot = process.env.CATALOGUS_IMAGES_ROOT?.trim()
  if (imagesRoot) {
    roots.push(imagesRoot)
  }

  roots.push(path.join(process.cwd(), 'public', 'images'))

  return resolveRoots(roots)
}

export function isCatalogImagesVpsWrite(): boolean {
  return Boolean(process.env.CATALOGUS_PUBLIC_HTML?.trim() || process.env.CATALOGUS_IMAGES_ROOT?.trim())
}

export function describeCatalogImagesWriteTarget(): string {
  const root = getCatalogImagesWriteRoots()[0] ?? ''
  if (isCatalogImagesVpsWrite()) {
    return root
  }
  return `${root} (local dev — set CATALOGUS_PUBLIC_HTML on the VPS for production imports)`
}

/** Ensure import mirror folders exist on the VPS images root. */
export function catalogImportMirrorDirs(): string[] {
  return ['imports/facebook', 'imports/woocommerce']
}
