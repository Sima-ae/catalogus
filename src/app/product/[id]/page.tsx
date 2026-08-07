import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { getProductById } from '@/lib/products-db'
import { formatPageTitle, getSiteSeo } from '@/lib/site-metadata'
import { withNoIndexMetadata } from '@/lib/no-index'
import { getServerLocale } from '@/lib/i18n-server-locale'
import { appOrigin, appPath } from '@/lib/paths'
import { localizedAppPathForLocale } from '@/lib/locale-path-routing'
import { absoluteCatalogImageUrl } from '@/lib/product-image-url'
import {
  getSiteUnlockState,
  resolvePublicProductAccess,
} from '@/lib/public-product-access'
import ProductPageClient from './ProductPageClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PageProps = { params: { id: string } }

const GATE_PATH = '/site-access-gate'

function productDescription(
  product: Record<string, unknown>,
  name: string,
  siteName: string
): string {
  const rawDescription = String(
    product.short_description || product.description || ''
  )
    .replace(/\s+/g, ' ')
    .trim()
  return rawDescription.slice(0, 160) || `${name} — available on ${siteName}.`
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await getServerLocale()
  const seo = await getSiteSeo(locale)
  try {
    const unlock = await getSiteUnlockState()
    const product = (await getProductById(params.id)) as Record<string, unknown> | null
    if (!product) {
      return withNoIndexMetadata({
        title: formatPageTitle('Product not found', seo.siteName),
        description: `This product is not available on ${seo.siteName}.`,
      })
    }

    const name = String(product.name || 'Product').trim()
    const description = productDescription(product, name, seo.siteName)
    const publicShare =
      product.public_share === true ||
      product.public_share === 1 ||
      product.public_share === '1'
    const canShowOg =
      publicShare || !unlock.required || unlock.unlocked

    if (!canShowOg) {
      // Locked + not public share: do not leak product title/image to crawlers.
      return withNoIndexMetadata({
        title: seo.siteName,
        description: seo.tagline,
      })
    }

    const base = withNoIndexMetadata({
      title: name,
      description,
    })

    if (!publicShare) {
      return base
    }

    const imageUrl = absoluteCatalogImageUrl(
      String(product.image_url || ''),
      product.source_url != null ? String(product.source_url) : null
    )
    const pageUrl = `${appOrigin}${localizedAppPathForLocale(`/product/${params.id}`, locale)}`

    return withNoIndexMetadata({
      title: name,
      description,
      alternates: { canonical: pageUrl },
      openGraph: {
        type: 'website',
        title: name,
        description,
        url: pageUrl,
        siteName: seo.siteName,
        locale,
        ...(imageUrl
          ? {
              images: [
                {
                  url: imageUrl,
                  alt: name,
                },
              ],
            }
          : {}),
      },
      twitter: {
        card: imageUrl ? 'summary_large_image' : 'summary',
        title: name,
        description,
        ...(imageUrl ? { images: [imageUrl] } : {}),
      },
    })
  } catch {
    return withNoIndexMetadata({
      title: seo.siteName,
      description: seo.tagline,
    })
  }
}

export default async function ProductPage({ params }: PageProps) {
  const access = await resolvePublicProductAccess(params.id)

  if (!access.allowed) {
    if (access.reason === 'not_found' || access.reason === 'unavailable') {
      notFound()
    }
    const locale = await getServerLocale()
    const from = localizedAppPathForLocale(`/product/${params.id}`, locale)
    redirect(`${appPath(GATE_PATH)}?from=${encodeURIComponent(from)}`)
  }

  return <ProductPageClient />
}
