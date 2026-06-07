import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { shouldWriteCatalogImagesViaSsh } from '@/lib/catalog-images-root'

function sshTarget(): { user: string; host: string; port: string } {
  return {
    user: process.env.SSH_USER?.trim() || process.env.VPS_USER?.trim() || 'root',
    host: process.env.VPS_HOST?.trim() || 'superclones.cloud',
    port: process.env.VPS_SSH_PORT?.trim() || process.env.SSH_PORT?.trim() || '22',
  }
}

function sshArgs(): string[] {
  const { port } = sshTarget()
  const args = [
    '-p',
    port,
    '-o',
    'BatchMode=yes',
    '-o',
    'StrictHostKeyChecking=accept-new',
    '-o',
    'IdentitiesOnly=yes',
  ]
  const key = process.env.VPS_SSH_KEY?.trim()
  if (key && fs.existsSync(key)) {
    args.push('-i', key)
  }
  return args
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

/** Remote images root on the VPS, e.g. /home/superclones.cloud/public_html/images */
export function vpsCatalogImagesRoot(): string | null {
  const publicHtml = process.env.CATALOGUS_PUBLIC_HTML?.trim()
  if (!publicHtml) return null
  return path.posix.join(publicHtml.replace(/\\/g, '/'), 'images')
}

/** Production origin used when local dev proxies uploads (no working SSH key). */
export function catalogImageUploadProxyOrigin(): string | null {
  if (!shouldWriteCatalogImagesViaSsh()) return null
  const origin =
    process.env.CATALOG_IMAGE_UPLOAD_PROXY_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://superclones.cloud'
  return origin.replace(/\/$/, '')
}

function runSsh(remoteCommand: string, stdin?: Buffer): Promise<void> {
  const { user, host } = sshTarget()
  return new Promise((resolve, reject) => {
    const proc = spawn('ssh', [...sshArgs(), `${user}@${host}`, remoteCommand], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stderr = ''
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.trim() || `SSH exited with code ${code}`))
    })

    if (stdin) {
      proc.stdin.write(stdin)
    }
    proc.stdin.end()
  })
}

/** Write a catalog image file to public_html/images on the VPS over SSH. */
export async function writeCatalogImageViaSsh(
  relativePathFromImagesRoot: string,
  buffer: Buffer
): Promise<void> {
  const imagesRoot = vpsCatalogImagesRoot()
  if (!imagesRoot) {
    throw new Error('CATALOGUS_PUBLIC_HTML is not configured for VPS image writes')
  }

  const relative = relativePathFromImagesRoot.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!relative || relative.includes('..')) {
    throw new Error('Invalid catalog image path')
  }

  const remoteFile = path.posix.join(imagesRoot, relative)
  const remoteDir = path.posix.dirname(remoteFile)
  const command = `mkdir -p ${shellQuote(remoteDir)} && cat > ${shellQuote(remoteFile)}`

  await runSsh(command, buffer)
}

export type CatalogUploadAuthHeaders = {
  userId?: string | null
  userEmail?: string | null
}

/** Forward upload to production API — production writes directly to public_html/images. */
export async function uploadCatalogImageViaProductionProxy(
  file: File,
  buffer: Buffer,
  auth: CatalogUploadAuthHeaders
): Promise<{ url: string }> {
  const origin = catalogImageUploadProxyOrigin()
  if (!origin) {
    throw new Error('Catalog image upload proxy is not configured')
  }

  const userId = String(auth.userId ?? '').trim()
  const userEmail = String(auth.userEmail ?? '').trim()
  if (!userId || !userEmail) {
    throw new Error('Admin authentication required for VPS upload proxy')
  }

  const body = new FormData()
  body.append('file', new Blob([buffer], { type: file.type }), file.name || 'upload.jpg')

  const res = await fetch(`${origin}/api/product-images/upload`, {
    method: 'POST',
    headers: {
      'X-Catalogus-User-Id': userId,
      'X-Catalogus-User-Email': userEmail,
      'X-Catalogus-Upload-Proxy': '1',
    },
    body,
  })

  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!res.ok || !data.url) {
    throw new Error(data.error || `Production upload failed (HTTP ${res.status})`)
  }

  return { url: data.url }
}

export function describeVpsCatalogWriteTarget(): string {
  const root = vpsCatalogImagesRoot()
  const { user, host } = sshTarget()
  if (root) return `${user}@${host}:${root}`
  return ''
}

export function describeCatalogImageUploadTarget(): string {
  if (!shouldWriteCatalogImagesViaSsh()) {
    return 'local disk'
  }
  const proxy = catalogImageUploadProxyOrigin()
  if (proxy) return `${proxy}/api/product-images/upload (proxy) or SSH ${describeVpsCatalogWriteTarget()}`
  return `SSH ${describeVpsCatalogWriteTarget()}`
}
