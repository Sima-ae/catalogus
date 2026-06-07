import fs from 'fs/promises'
import path from 'path'
import { getCatalogImagesRoots, getCatalogImagesWriteRoots } from '@/lib/catalog-images-root'

/** Path segment under the images root, e.g. `imports/woocommerce/wc-3693/001.jpg`. */
export function catalogImageRelativePath(relativePathFromImagesRoot: string): string {
  const normalized = relativePathFromImagesRoot.replace(/\\/g, '/').replace(/^\/+/, '')
  if (normalized.includes('..')) {
    throw new Error('Invalid catalog image path')
  }
  return normalized
}

export function catalogImagePublicPath(relativePathFromImagesRoot: string): string {
  return `/images/${catalogImageRelativePath(relativePathFromImagesRoot)}`
}

export async function writeCatalogImageFile(
  relativePathFromImagesRoot: string,
  buffer: Buffer
): Promise<string> {
  const relative = catalogImageRelativePath(relativePathFromImagesRoot)
  const roots = getCatalogImagesWriteRoots()
  let written = false
  let lastError: unknown

  for (const root of roots) {
    try {
      const filePath = path.join(root, relative)
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, buffer)
      written = true
      break
    } catch (err) {
      lastError = err
    }
  }

  if (!written) {
    console.error('Catalog image write failed:', lastError)
    throw new Error('Could not save image to disk')
  }

  return catalogImagePublicPath(relative)
}

export async function clearCatalogImageDirectory(
  relativeDirFromImagesRoot: string
): Promise<void> {
  const relative = catalogImageRelativePath(relativeDirFromImagesRoot)
  const roots = getCatalogImagesRoots()

  for (const root of roots) {
    const dirPath = path.join(root, relative)
    try {
      await fs.rm(dirPath, { recursive: true, force: true })
    } catch {
      /* directory may not exist on every root */
    }
  }
}
