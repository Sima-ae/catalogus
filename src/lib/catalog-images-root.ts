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

/** New uploads and imports always go to public/images (committed and deployed via git). */
export function getCatalogImagesWriteRoots(): string[] {
  return resolveRoots([repoImagesRoot()])
}

export function isCatalogImagesVpsWrite(): boolean {
  return Boolean(process.env.CATALOGUS_PUBLIC_HTML?.trim() || process.env.CATALOGUS_IMAGES_ROOT?.trim())
}

export function describeCatalogImagesWriteTarget(): string {
  return `${repoImagesRoot()} (git — push public/images to deploy)`
}

/** Ensure import mirror folders exist under public/images. */
export function catalogImportMirrorDirs(): string[] {
  return ['imports/facebook', 'imports/woocommerce', 'imports/lkxox', 'uploads']
}

/** @deprecated Imports no longer use SSH — kept for older scripts. */
export function shouldWriteCatalogImagesViaSsh(): boolean {
  return false
}

export function isOffVpsDiskDevelopment(): boolean {
  return false
}
