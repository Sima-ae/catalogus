import { APP_DEFAULT_AUTHOR, APP_DEFAULT_AUTHOR_ICON } from '@/lib/brand'

/** Sample product when DB is offline in development */
export const DEV_PRODUCTS = [
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Temprador WooCommerce Template',
    description:
      'Premium WooCommerce template for modern e-commerce stores.',
    short_description: 'Premium WooCommerce template.',
    price: 59,
    original_price: 65,
    image_url: 'https://picsum.photos/600/400?random=1',
    gallery_images: ['https://picsum.photos/600/400?random=1'],
    category: 'WordPress Theme',
    tags: ['WooCommerce', 'WordPress'],
    author: APP_DEFAULT_AUTHOR,
    author_icon: APP_DEFAULT_AUTHOR_ICON,
    sku: 'TEMP-WC-001',
    status: 'active',
    featured: true,
    rating: 4.8,
    review_count: 127,
    download_count: 2341,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-15T00:00:00.000Z',
  },
]

import { isDevFallbackEnabled } from '@/lib/runtime'

export function isDevDataFallbackEnabled() {
  return isDevFallbackEnabled()
}
