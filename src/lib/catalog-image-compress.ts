import path from 'path'
import sharp from 'sharp'

/** Longest edge for catalog photos (card + PDP). */
export const CATALOG_IMAGE_MAX_EDGE = 1600
/** JPEG quality after resize (mozjpeg). */
export const CATALOG_IMAGE_JPEG_QUALITY = 80
/** WebP quality after resize. */
export const CATALOG_IMAGE_WEBP_QUALITY = 80

export type CompressCatalogImageResult = {
  buffer: Buffer
  /** Extension without dot (jpg, png, webp, gif). */
  ext: string
  compressed: boolean
  originalBytes: number
  outputBytes: number
  width?: number
  height?: number
}

function normalizeExt(ext: string | null | undefined): string | null {
  const raw = String(ext ?? '')
    .trim()
    .toLowerCase()
    .replace(/^\./, '')
  if (!raw) return null
  if (raw === 'jpeg') return 'jpg'
  return raw
}

function extFromSharpFormat(format: string | undefined): string | null {
  if (!format) return null
  if (format === 'jpeg' || format === 'jpg') return 'jpg'
  if (format === 'png' || format === 'webp' || format === 'gif' || format === 'avif') {
    return format
  }
  return null
}

/**
 * Resize + re-encode product images for the catalog.
 * Opaque PNGs become JPEG. Animated GIFs are left unchanged.
 */
export async function compressCatalogImageBuffer(
  input: Buffer,
  options?: {
    sourceExt?: string | null
    maxEdge?: number
    jpegQuality?: number
    webpQuality?: number
  }
): Promise<CompressCatalogImageResult> {
  const originalBytes = input.length
  const sourceExt = normalizeExt(options?.sourceExt)
  const maxEdge = options?.maxEdge ?? CATALOG_IMAGE_MAX_EDGE
  const jpegQuality = options?.jpegQuality ?? CATALOG_IMAGE_JPEG_QUALITY
  const webpQuality = options?.webpQuality ?? CATALOG_IMAGE_WEBP_QUALITY

  if (!input.length) {
    return {
      buffer: input,
      ext: sourceExt || 'jpg',
      compressed: false,
      originalBytes,
      outputBytes: originalBytes,
    }
  }

  try {
    const image = sharp(input, { failOn: 'none', animated: false })
    const meta = await image.metadata()
    const formatExt = extFromSharpFormat(meta.format)
    const pages = Number(meta.pages ?? 1)

    // Keep animated GIFs as-is (sharp would flatten to one frame).
    if (meta.format === 'gif' && pages > 1) {
      return {
        buffer: input,
        ext: 'gif',
        compressed: false,
        originalBytes,
        outputBytes: originalBytes,
        width: meta.width,
        height: meta.height,
      }
    }

    let pipeline = image.rotate()
    const width = meta.width ?? 0
    const height = meta.height ?? 0
    if (width > maxEdge || height > maxEdge) {
      pipeline = pipeline.resize({
        width: maxEdge,
        height: maxEdge,
        fit: 'inside',
        withoutEnlargement: true,
      })
    }

    const hasAlpha = meta.hasAlpha === true
    let out: Buffer
    let outExt: string

    if (meta.format === 'png' && hasAlpha) {
      out = await pipeline
        .png({ compressionLevel: 9, palette: true, effort: 7 })
        .toBuffer()
      outExt = 'png'
    } else if (meta.format === 'webp') {
      out = await pipeline.webp({ quality: webpQuality, effort: 4 }).toBuffer()
      outExt = 'webp'
    } else if (meta.format === 'png' && !hasAlpha) {
      // Opaque PNG photos → JPEG (huge win for WeCatalog-style assets).
      out = await pipeline.jpeg({ quality: jpegQuality, mozjpeg: true }).toBuffer()
      outExt = 'jpg'
    } else {
      out = await pipeline.jpeg({ quality: jpegQuality, mozjpeg: true }).toBuffer()
      outExt = 'jpg'
    }

    // Prefer original when compression did not help and we did not need a resize.
    const didResize = width > maxEdge || height > maxEdge
    if (!didResize && out.length >= originalBytes) {
      return {
        buffer: input,
        ext: sourceExt || formatExt || outExt,
        compressed: false,
        originalBytes,
        outputBytes: originalBytes,
        width,
        height,
      }
    }

    return {
      buffer: out,
      ext: outExt,
      compressed: true,
      originalBytes,
      outputBytes: out.length,
      width,
      height,
    }
  } catch {
    return {
      buffer: input,
      ext: sourceExt || 'jpg',
      compressed: false,
      originalBytes,
      outputBytes: originalBytes,
    }
  }
}

/** MIME type for a catalog image extension (no dot). */
export function mimeTypeForCatalogImageExt(ext: string | null | undefined): string {
  const e = normalizeExt(ext) || 'jpg'
  if (e === 'png') return 'image/png'
  if (e === 'webp') return 'image/webp'
  if (e === 'gif') return 'image/gif'
  if (e === 'avif') return 'image/avif'
  return 'image/jpeg'
}

/** Extension hint from a Content-Type header. */
export function catalogImageExtFromMime(contentType: string | null | undefined): string | null {
  const base = String(contentType ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase()
  if (base === 'image/jpeg' || base === 'image/jpg') return 'jpg'
  if (base === 'image/png') return 'png'
  if (base === 'image/webp') return 'webp'
  if (base === 'image/gif') return 'gif'
  if (base === 'image/avif') return 'avif'
  return null
}

/** Swap/replace file extension in a relative path under the images root. */
export function replaceCatalogImageExtension(
  relativePathFromImagesRoot: string,
  nextExt: string
): string {
  const ext = normalizeExt(nextExt) || 'jpg'
  const normalized = relativePathFromImagesRoot.replace(/\\/g, '/')
  const parsed = path.posix.parse(normalized)
  const dir = parsed.dir && parsed.dir !== '.' ? `${parsed.dir}/` : ''
  return `${dir}${parsed.name}.${ext}`
}

