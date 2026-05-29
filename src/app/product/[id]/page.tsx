import type { Metadata } from 'next'
import { APP_NAME } from '@/lib/brand'
import { getProductById } from '@/lib/products-db'
import ProductPageClient from './ProductPageClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PageProps = { params: { id: string } }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const product = (await getProductById(params.id)) as Record<string, unknown> | null
    if (!product) {
      return {
        title: `Product not found | ${APP_NAME}`,
        description: `This product is not available on ${APP_NAME}.`,
      }
    }

    const name = String(product.name || 'Product').trim()
    const rawDescription = String(
      product.short_description || product.description || ''
    )
      .replace(/\s+/g, ' ')
      .trim()
    const description =
      rawDescription.slice(0, 160) || `${name} — available on ${APP_NAME}.`

    const imageUrl = product.image_url ? String(product.image_url) : undefined

    return {
      title: `${name} | ${APP_NAME}`,
      description,
      openGraph: {
        title: name,
        description,
        type: 'website',
        ...(imageUrl ? { images: [{ url: imageUrl, alt: name }] } : {}),
      },
      twitter: {
        card: imageUrl ? 'summary_large_image' : 'summary',
        title: name,
        description,
        ...(imageUrl ? { images: [imageUrl] } : {}),
      },
    }
  } catch {
    return {
      title: APP_NAME,
      description: `Browse digital products on ${APP_NAME}.`,
    }
  }
}

export default function ProductPage() {
  return <ProductPageClient />
}
