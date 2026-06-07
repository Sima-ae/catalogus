import { spawn } from 'child_process'
import path from 'path'

function sshTarget(): { user: string; host: string; port: string } {
  return {
    user: process.env.SSH_USER?.trim() || process.env.VPS_USER?.trim() || 'root',
    host: process.env.VPS_HOST?.trim() || 'superclones.cloud',
    port: process.env.VPS_SSH_PORT?.trim() || process.env.SSH_PORT?.trim() || '22',
  }
}

function sshArgs(): string[] {
  const { port } = sshTarget()
  const args = ['-p', port, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new']
  const key = process.env.VPS_SSH_KEY?.trim()
  if (key) args.push('-i', key)
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

export function describeVpsCatalogWriteTarget(): string {
  const root = vpsCatalogImagesRoot()
  const { user, host } = sshTarget()
  return root ? `${user}@${host}:${root}` : ''
}
