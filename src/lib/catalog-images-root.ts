import path from 'path'

function resolveRoots(paths: string[]): string[] {
  return Array.from(new Set(paths.map((r) => path.resolve(r))))
}

const repoImagesRoot = () => path.join(process.cwd(), 'public', 'images')

/** All directories where catalog images may exist (read / delete). */
export function getCatalogImagesRoots(): string[] {
  const roots: string[] = [repoImagesRoot()]

  const publicHtml = process.env.CATALOGUS_PUBLIC_HTML?.trim()
  if (publicHtml) {
    roots.push(path.join(publicHtml, 'images'))
  }

  const imagesRoot = process.env.CATALOGUS_IMAGES_ROOT?.trim()
  if (imagesRoot) {
    roots.push(imagesRoot)
  }

  return resolveRoots(roots)
}

/** New uploads and imports: VPS → public_html/images; local dev → public/images (git deploy). */
export function getCatalogImagesWriteRoots(): string[] {
  const publicHtml = process.env.CATALOGUS_PUBLIC_HTML?.trim()
  if (publicHtml) {
    return resolveRoots([path.join(publicHtml, 'images')])
  }

  const imagesRoot = process.env.CATALOGUS_IMAGES_ROOT?.trim()
  if (imagesRoot) {
    return resolveRoots([imagesRoot])
  }

  return resolveRoots([repoImagesRoot()])
}
export function isCatalogImagesVpsWrite(): boolean {
  return Boolean(process.env.CATALOGUS_PUBLIC_HTML?.trim() || process.env.CATALOGUS_IMAGES_ROOT?.trim())
}

/** WeCatalog (and similar bulk mirrors) must write to VPS public_html — not local public/images. */
export function assertCatalogImagesVpsWrite(label = 'This import'): void {
  if (isCatalogImagesVpsWrite()) return
  throw new Error(
    `${label} requires VPS image storage. Run import:worker on the VPS with CATALOGUS_PUBLIC_HTML set in .env (do not run locally — images must not go to public/images in git).`
  )
}

export function describeCatalogImagesWriteTarget(): string {
  const publicHtml = process.env.CATALOGUS_PUBLIC_HTML?.trim()
  if (publicHtml) {
    return `${path.join(publicHtml, 'images')} (VPS public_html — served directly)`
  }
  return `${repoImagesRoot()} (git — commit and push public/images to deploy)`
}

/** Ensure import mirror folders exist under public/images. */
export function catalogImportMirrorDirs(): string[] {
  return ['imports/facebook', 'imports/woocommerce', 'imports/lkxox', 'imports/wecatalog', 'uploads']
}

/** @deprecated Imports no longer use SSH — kept for older scripts. */
export function shouldWriteCatalogImagesViaSsh(): boolean {
  return false
}

export function isOffVpsDiskDevelopment(): boolean {
  return false
}
