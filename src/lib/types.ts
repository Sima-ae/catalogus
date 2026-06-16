import type { ProductOptions } from '@/lib/product-options'

export interface Product {
  id: string
  name: string
  description: string
  short_description?: string
  price: number
  original_price?: number
  purchase_price?: number
  shipping_cost?: number | null
  image_url: string
  gallery_images?: string[]
  available_sizes?: string[]
  available_colors?: string[]
  product_options?: ProductOptions | null
  source_url?: string | null
  source_album_id?: string | null
  category: string
  category_id?: string | null
  brand?: string
  brand_id?: string | null
  tags?: string[]
  author_id?: string
  author: string
  author_icon: string
  sku?: string
  download_url?: string
  demo_url?: string
  documentation_url?: string
  support_url?: string
  compatibility?: string
  version?: string
  license_type?: string
  file_size?: string
  requirements?: any
  features?: string[]
  changelog?: string
  rating?: number
  review_count?: number
  download_count?: number
  status: 'active' | 'inactive' | 'draft' | 'trash'
  featured?: boolean
  sold_out?: boolean
  supplier_pricelist_id?: string | null
  supplier_pricelist_label?: string | null
  supplier_pricelist_slug?: string | null
  pre_order?: boolean
  created_at: string
  updated_at: string
}

