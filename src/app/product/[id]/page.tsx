import type { Metadata } from 'next'
import { getProductById } from '@/lib/products-db'
import { formatPageTitle, getSiteSeo } from '@/lib/site-metadata'
import { getServerLocale } from '@/lib/i18n-server-locale'
import ProductPageClient from './ProductPageClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PageProps = { params: { id: string } }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await getServerLocale()
  const seo = await getSiteSeo(locale)
  try {
    const product = (await getProductById(params.id)) as Record<string, unknown> | null
    if (!product) {
      return {
        title: formatPageTitle('Product not found', seo.siteName),
        description: `This product is not available on ${seo.siteName}.`,
      }
    }

    const name = String(product.name || 'Product').trim()
    const rawDescription = String(
      product.short_description || product.description || ''
    )
      .replace(/\s+/g, ' ')
      .trim()
    const description =
      rawDescription.slice(0, 160) || `${name} — available on ${seo.siteName}.`

    const imageUrl = product.image_url ? String(product.image_url) : undefined

    return {
      title: name,
      description,
      openGraph: {
        title: formatPageTitle(name, seo.siteName),
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
      title: seo.siteName,
      description: seo.tagline,
    }
  }
}

export default function ProductPage() {
  return <ProductPageClient />
}
