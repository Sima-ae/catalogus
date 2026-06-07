import fs from 'fs/promises'
import path from 'path'
import {
  getCatalogImagesRoots,
  getCatalogImagesWriteRoots,
  shouldWriteCatalogImagesViaSsh,
} from '@/lib/catalog-images-root'
import { writeCatalogImageViaSsh } from '@/lib/catalog-image-vps-write'

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

function catalogImagePathFromUrl(url: string | null | undefined): string | null {
  const raw = String(url ?? '').trim()
  if (!raw) return null

  if (/^https?:\/\//i.test(raw)) {
    try {
      const pathname = new URL(raw).pathname
      if (pathname.startsWith('/images/')) return pathname
      return null
    } catch {
      return null
    }
  }

  const normalized = raw.replace(/\\/g, '/')
  if (normalized.startsWith('/images/')) return normalized
  if (normalized.startsWith('images/')) return `/${normalized}`
  return null
}

/** Relative path under the images root from a public /images/… URL. */
export function catalogImageRelativeFromPublicUrl(url: string | null | undefined): string | null {
  const pathPart = catalogImagePathFromUrl(url)
  if (!pathPart) return null
  return catalogImageRelativePath(pathPart.slice('/images/'.length))
}

/** True when the mirrored file exists on at least one catalog images root. */
export async function catalogImageFileExists(url: string | null | undefined): Promise<boolean> {
  const relative = catalogImageRelativeFromPublicUrl(url)
  if (!relative) return false

  for (const root of getCatalogImagesRoots()) {
    const filePath = path.join(root, relative)
    try {
      const stat = await fs.stat(filePath)
      if (stat.isFile() && stat.size > 0) return true
    } catch {
      /* try next root */
    }
  }
  return false
}

export async function writeCatalogImageFile(
  relativePathFromImagesRoot: string,
  buffer: Buffer
): Promise<string> {
  const relative = catalogImageRelativePath(relativePathFromImagesRoot)

  if (shouldWriteCatalogImagesViaSsh()) {
    try {
      await writeCatalogImageViaSsh(relative, buffer)
      return catalogImagePublicPath(relative)
    } catch (err) {
      console.error('Catalog image VPS write failed:', err)
      throw new Error('Could not save image to VPS')
    }
  }

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
