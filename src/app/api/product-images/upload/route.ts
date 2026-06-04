import { NextRequest, NextResponse } from 'next/server'
import { getDbErrorMessage } from '@/lib/db-errors'
import { requireProductWrite } from '@/lib/product-api-auth'
import { saveProductImageUpload } from '@/lib/product-image-upload'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await requireProductWrite(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }

    const { url } = await saveProductImageUpload(file)
    return NextResponse.json({ url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    console.error('Product image upload:', error)
    return NextResponse.json(
      { error: getDbErrorMessage(error, message) },
      { status: message.includes('allowed') || message.includes('smaller') ? 400 : 503 }
    )
  }
}
