import path from 'path'
import { existsSync } from 'fs'

/** VPS: /home/.../public_html/images — local dev: public/images if present */
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

  const unique = Array.from(new Set(roots.map((r) => path.resolve(r)).filter((r) => existsSync(r))))
  return unique
}
