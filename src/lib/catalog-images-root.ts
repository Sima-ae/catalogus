import fs from 'fs'
import path from 'path'
import { describeVpsCatalogWriteTarget } from '@/lib/catalog-image-vps-write'

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

function isWritableDir(dir: string): boolean {
  try {
    fs.accessSync(dir, fs.constants.W_OK)
    return true
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

/** True when CATALOGUS_PUBLIC_HTML is set but not reachable on this machine → use SSH. */
export function shouldWriteCatalogImagesViaSsh(): boolean {
  const publicHtml = process.env.CATALOGUS_PUBLIC_HTML?.trim()
  if (!publicHtml) return false
  return !isWritableDir(publicHtml)
}

/**
 * Local write roots only. When CATALOGUS_PUBLIC_HTML is configured, writes go to
 * public_html/images on the VPS (directly on-server, or via SSH from a Mac).
 */
export function getCatalogImagesWriteRoots(): string[] {
  const roots: string[] = []

  const publicHtml = process.env.CATALOGUS_PUBLIC_HTML?.trim()
  if (publicHtml && isWritableDir(publicHtml)) {
    roots.push(path.join(publicHtml, 'images'))
  }

  const imagesRoot = process.env.CATALOGUS_IMAGES_ROOT?.trim()
  if (imagesRoot && (isWritableDir(imagesRoot) || isWritableDir(path.dirname(imagesRoot)))) {
    roots.push(imagesRoot)
  }

  // Only use repo public/images when no VPS path is configured (offline local dev).
  if (!publicHtml) {
    roots.push(path.join(process.cwd(), 'public', 'images'))
  }

  return resolveRoots(roots)
}

export function isCatalogImagesVpsWrite(): boolean {
  return Boolean(process.env.CATALOGUS_PUBLIC_HTML?.trim() || process.env.CATALOGUS_IMAGES_ROOT?.trim())
}

export function describeCatalogImagesWriteTarget(): string {
  if (shouldWriteCatalogImagesViaSsh()) {
    return describeVpsCatalogWriteTarget()
  }
  const root = getCatalogImagesWriteRoots()[0] ?? ''
  if (isCatalogImagesVpsWrite()) {
    return root
  }
  return `${root} (local dev — set CATALOGUS_PUBLIC_HTML on the VPS for production imports)`
}

/** Ensure import mirror folders exist on the VPS images root. */
export function catalogImportMirrorDirs(): string[] {
  return ['imports/facebook', 'imports/woocommerce', 'uploads']
}
