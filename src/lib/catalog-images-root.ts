import path from 'path'

function resolveRoots(paths: string[]): string[] {
  return Array.from(new Set(paths.map((r) => path.resolve(r))))
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
 * When CATALOGUS_PUBLIC_HTML is set (VPS), writes go to public_html/images only —
 * not into the git checkout under public/images.
 */
export function getCatalogImagesWriteRoots(): string[] {
  const roots: string[] = []

  const publicHtml = process.env.CATALOGUS_PUBLIC_HTML?.trim()
  if (publicHtml) {
    roots.push(path.join(publicHtml, 'images'))
  }

  const imagesRoot = process.env.CATALOGUS_IMAGES_ROOT?.trim()
  if (imagesRoot) {
    roots.push(imagesRoot)
  }

  if (!roots.length) {
    roots.push(path.join(process.cwd(), 'public', 'images'))
  }

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
