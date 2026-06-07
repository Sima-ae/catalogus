import { NextRequest, NextResponse } from 'next/server'
import { catalogImageUploadCorsHeaders } from '@/lib/catalog-image-upload-cors'
import { getDbErrorMessage } from '@/lib/db-errors'
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { requireProductWrite } from '@/lib/product-api-auth'
import { saveProductImageUpload } from '@/lib/product-image-upload'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function jsonWithCors(
  request: NextRequest,
  body: Record<string, unknown>,
  status: number
) {
  return NextResponse.json(body, {
    status,
    headers: catalogImageUploadCorsHeaders(request),
  })
}

export async function OPTIONS(request: NextRequest) {
  ensureEnvLoaded()
  const cors = catalogImageUploadCorsHeaders(request)
  if (!Object.keys(cors).length) {
    return new NextResponse(null, { status: 204 })
  }
  return new NextResponse(null, { status: 204, headers: cors })
}

export async function POST(request: NextRequest) {
  ensureEnvLoaded()

  const auth = await requireProductWrite(request)
  if (!auth.ok) {
    return jsonWithCors(request, { error: auth.error }, auth.status)
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return jsonWithCors(request, { error: 'file is required' }, 400)
    }

    const { url } = await saveProductImageUpload(file, {
      userId: request.headers.get('x-catalogus-user-id'),
      userEmail: request.headers.get('x-catalogus-user-email'),
    })
    return jsonWithCors(request, { url }, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    console.error('Product image upload:', error)
    return jsonWithCors(
      request,
      { error: getDbErrorMessage(error, message) },
      message.includes('allowed') || message.includes('smaller') ? 400 : 503
    )
  }
}
